/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011 Zimbra, Inc.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.cs.index;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import org.apache.lucene.document.Document;
import org.apache.lucene.index.Term;
import org.apache.lucene.search.BooleanClause;
import org.apache.lucene.search.BooleanClause.Occur;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.Sort;
import org.apache.lucene.search.SortField;
import org.apache.lucene.search.TermQuery;
import org.apache.lucene.search.TopDocs;

import com.google.common.collect.LinkedHashMultimap;
import com.google.common.collect.Multimap;
import com.google.common.io.Closeables;
import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.mailbox.Mailbox;

/**
 * {@link QueryOperation} which queries Lucene.
 */
public final class LuceneQueryOperation extends QueryOperation {
    private static final float DB_FIRST_TERM_FREQ_PERC;
    static {
        float f = 0.8f;
        try {
            f = Float.parseFloat(LC.search_dbfirst_term_percentage_cutoff.value());
        } catch (Exception e) {
        }
        if (f < 0.0 || f > 1.0) {
            f = 0.8f;
        }
        DB_FIRST_TERM_FREQ_PERC = f;
    }

    private int curHitNo = 0; // our offset into the hits
    private boolean haveRunSearch = false;
    private String queryString = "";
    private Query luceneQuery;

    /**
     * Used for doing DB-joins: the list of terms for the filter one of the
     * terms in the list MUST occur in the document for it to match.
     */
    private List<Term> filterTerms;

    /**
     * Because we don't store the real mail-item-id of documents, we ALWAYS need
     * a DBOp in order to properly get our results.
     */
    private DBQueryOperation dbOp;
    private List<QueryInfo> queryInfo = new ArrayList<QueryInfo>();
    private boolean hasSpamTrashSetting = false;

    private TopDocs hits;
    private int topDocsLen = 0; // number of hits fetched
    private int topDocsChunkSize = 2000; // how many hits to fetch per step in Lucene
    private IndexSearcher searcher;
    private Sort sort;

    /**
     * Adds the specified text clause at the top level.
     * <p>
     * e.g. going in "a b c" if we addClause("d") we get "a b c d".
     *
     * @param queryStr Appended to the end of the text-representation of this query
     * @param query Lucene query
     * @param bool allows for negated query terms
     */
    public void addClause(String queryStr, Query query, boolean bool) {
        assert(!haveRunSearch);

        // ignore empty BooleanQuery
        if (query instanceof BooleanQuery && ((BooleanQuery) query).clauses().isEmpty()) {
            return;
        }

        queryString = queryString + " " + (bool ? "" : "-") + queryStr;
        if (bool) {
            if (luceneQuery == null) {
                luceneQuery = query;
            } else if (luceneQuery instanceof BooleanQuery) {
                ((BooleanQuery) luceneQuery).add(query, BooleanClause.Occur.MUST);
            } else if (query instanceof BooleanQuery) {
                ((BooleanQuery) query).add(luceneQuery, BooleanClause.Occur.MUST);
                luceneQuery = query;
            } else {
                BooleanQuery combined = new BooleanQuery();
                combined.add(luceneQuery, BooleanClause.Occur.MUST);
                combined.add(query, BooleanClause.Occur.MUST);
                luceneQuery = combined;
            }
        } else {
            if (luceneQuery == null) {
                BooleanQuery negate = new BooleanQuery();
                negate.add(query, BooleanClause.Occur.MUST_NOT);
                luceneQuery = negate;
            } else if (luceneQuery instanceof BooleanQuery) {
                ((BooleanQuery) luceneQuery).add(query, BooleanClause.Occur.MUST_NOT);
            } else {
                BooleanQuery combined = new BooleanQuery();
                combined.add(luceneQuery, BooleanClause.Occur.MUST);
                combined.add(query, BooleanClause.Occur.MUST_NOT);
                luceneQuery = combined;
            }
        }
    }

    /**
     * Adds the specified text clause ANDED with the existing query.
     * <p>
     * e.g. going in w/ "a b c" if we addAndedClause("d") we get "(a b c) AND d".
     * <p>
     * This API may only be called AFTER query optimizing and AFTER remote queries have been split.
     * <p>
     * Note that this API does *not* update the text-representation of this query.
     */
    void addAndedClause(Query q, boolean bool) {
        haveRunSearch = false; // will need to re-run the search with this new clause
        curHitNo = 0;

        BooleanQuery top = new BooleanQuery();
        BooleanClause lhs = new BooleanClause(luceneQuery, BooleanClause.Occur.MUST);
        BooleanClause rhs = new BooleanClause(q, bool ? BooleanClause.Occur.MUST : BooleanClause.Occur.MUST_NOT);
        top.add(lhs);
        top.add(rhs);
        luceneQuery = top;
    }

    /**
     * Adds the specified text clause as a filter over the existing query.
     * <p>
     * e.g. going in w/ "a b c" if we addAndedClause("d") we get "(a b c) AND d".
     * <p>
     * This API is used by the query executor so that it can temporarily add a bunch of indexIds to the existing query
     * -- this is necessary when we are doing a DB-first query plan execution.
     * <p>
     * Note that this API does *not* update the text-representation of this query.
     */
    void addFilterClause(Term t) {
        haveRunSearch = false; // will need to re-run the search with this new clause
        curHitNo = 0;

        if (filterTerms == null) {
            filterTerms = new ArrayList<Term>();
        }
        filterTerms.add(t);
    }

    /**
     * Clears the filter clause
     */
    void clearFilterClause() {
        filterTerms = null;
    }

    /**
     * Sets the text query *representation* manually -- the thing that is output if we have to proxy this search
     * somewhere else -- used when dealing with wildcard searches.
     */
    public void setQueryString(String value) {
        assert(queryString.isEmpty());
        queryString = value;
    }

    @Override
    String toQueryString() {
        StringBuilder ret = new StringBuilder("(");
        ret.append(queryString);
        return ret.append(")").toString();
    }

    /**
     * Returns {@code true} if we think this query is best evaluated DB-FIRST.
     */
    boolean shouldExecuteDbFirst() {
        if (searcher == null || luceneQuery == null) {
            return true;
        }

        if (luceneQuery instanceof TermQuery) {
            TermQuery query = (TermQuery) luceneQuery;
            Term term = query.getTerm();
            try {
                int freq = searcher.docFreq(term);
                int docsCutoff = (int) (searcher.getIndexReader().numDocs() * DB_FIRST_TERM_FREQ_PERC);
                ZimbraLog.search.debug("Term matches %d docs. DB-First cutoff (%d%%) is %d docs",
                        freq, (int) (100 * DB_FIRST_TERM_FREQ_PERC), docsCutoff);
                if (freq > docsCutoff) {
                    return true;
                }
            } catch (IOException e) {
                return false;
            }
        }

        try {
            //TODO count results using TotalHitCountCollector
            fetchFirstResults(1000); // some arbitrarily large initial size to fetch
            ZimbraLog.search.debug("Lucene part has %d hits", getTotalHitCount());
            if (getTotalHitCount() > 1000) { // also arbitrary, just to make very small searches run w/o extra DB check
                int dbHitCount = dbOp.getDbHitCount();
                ZimbraLog.search.debug("Lucene part has %d hits, db part has %d", getTotalHitCount(), dbHitCount);
                if (dbHitCount < getTotalHitCount()) {
                    return true; // run DB-FIRST
                }
            }
            return false;
        } catch (ServiceException e) {
            return false;
        }
    }

    @Override
    public void close() {
        Closeables.closeQuietly(searcher);
        searcher = null;
    }

    private void fetchFirstResults(int initialChunkSize) {
        if (!haveRunSearch) {
            assert(curHitNo == 0);
            topDocsLen = 3 * initialChunkSize;
            long start= System.currentTimeMillis();
            runSearch();
            ZimbraLog.search.debug("Fetched Initial %d (out of %d total) search results from Lucene in %d ms",
                    topDocsLen, hits != null ? hits.totalHits : 0, System.currentTimeMillis() - start);
        }
    }

    /**
     * Fetch the next chunk of results.
     * <p>
     * Called by a {@link DBQueryOperation} that is wrapping us in a DB-First query plan: gets a chunk of results that
     * it feeds into a SQL query.
     */
    LuceneResultsChunk getNextResultsChunk(int max) {
        if (!haveRunSearch) {
            fetchFirstResults(max);
        }

        LuceneResultsChunk result = new LuceneResultsChunk();
        int luceneLen = hits != null ? hits.totalHits : 0;
        while ((result.size() < max) && (curHitNo < luceneLen)) {
            if (topDocsLen <= curHitNo) {
                topDocsLen += topDocsChunkSize;
                topDocsChunkSize *= 4;
                if (topDocsChunkSize > 1000000) {
                    topDocsChunkSize = 1000000;
                }
                if (topDocsLen > luceneLen) {
                    topDocsLen = luceneLen;
                }
                long start = System.currentTimeMillis();
                runSearch();
                ZimbraLog.search.debug("Fetched %d search results from Lucene in %d ms",
                        topDocsLen, System.currentTimeMillis() - start);
            }

            Document doc;
            try {
                doc = searcher.doc(hits.scoreDocs[curHitNo].doc);
            } catch (Exception e) {
                ZimbraLog.search.error("Failed to retrieve Lucene document: %d", hits.scoreDocs[curHitNo].doc, e);
                return result;
            }
            curHitNo++;
            String mbid = doc.get(LuceneFields.L_MAILBOX_BLOB_ID);
            if (mbid != null) {
                try {
                    result.addHit(Integer.parseInt(mbid), doc);
                } catch (NumberFormatException e) {
                    ZimbraLog.search.error("Invalid MAILBOX_BLOB_ID: " + mbid, e);
                }
            }
        }
        return result;
    }

    private boolean isMustNotOnly(BooleanQuery query) {
        for (BooleanClause clause : query.clauses()) {
            if (clause.getOccur() != BooleanClause.Occur.MUST_NOT) {
                return false;
            }
        }
        return true;
    }

    /**
     * Execute the actual search via Lucene
     */
    private void runSearch() {
        haveRunSearch = true;

        if (searcher == null) { // this can happen if the Searcher couldn't be opened, e.g. index does not exist
            hits = null;
            return;
        }

        try {
            if (luceneQuery instanceof BooleanQuery) {
                BooleanQuery booleanQuery = (BooleanQuery) luceneQuery;
                // It is not possible to search for queries that only consist of a MUST_NOT clause. Combining with
                // MatchAllDocsQuery works in general, but we generate more than one documents per item for multipart
                // messages. If we match including non top level parts, negative queries will end up matching
                // everything. Therefore we only match the top level part for negative queries.
                if (isMustNotOnly(booleanQuery)) {
                    booleanQuery.add(new TermQuery(new Term(LuceneFields.L_PARTNAME, LuceneFields.L_PARTNAME_TOP)),
                            BooleanClause.Occur.SHOULD);
                    booleanQuery.add(new TermQuery(new Term(LuceneFields.L_PARTNAME, LuceneFields.L_PARTNAME_CONTACT)),
                            BooleanClause.Occur.SHOULD);
                    booleanQuery.add(new TermQuery(new Term(LuceneFields.L_PARTNAME, LuceneFields.L_PARTNAME_NOTE)),
                            BooleanClause.Occur.SHOULD);
                }
            }
            ZimbraLog.search.debug("Executing Lucene Query: %s", luceneQuery);
            TermsFilter filter = null;
            if (filterTerms != null) {
                filter = new TermsFilter();
                for (Term t : filterTerms) {
                    filter.addTerm(t);
                }
            }
            if (sort == null) {
                hits = searcher.search(luceneQuery, filter, topDocsLen);
            } else {
                hits = searcher.search(luceneQuery, filter, topDocsLen, sort);
            }
        } catch (IOException e) {
            ZimbraLog.search.error("Failed to search", e);
            Closeables.closeQuietly(searcher);
            searcher = null;
            hits = null;
        }
    }

    @Override
    public String toString() {
        return "LUCENE(" + luceneQuery + (hasSpamTrashSetting() ? " <ANYWHERE>" : "") + ")";
    }

    /**
     * Just clone *this* object, don't clone the embedded DBOp
     */
    private LuceneQueryOperation cloneInternal() {
        assert(!haveRunSearch);
        LuceneQueryOperation toRet = (LuceneQueryOperation) super.clone();
        toRet.luceneQuery = (BooleanQuery) luceneQuery.clone();
        return toRet;
    }

    @Override
    public Object clone() {
        assert(searcher == null);
        LuceneQueryOperation toRet = cloneInternal();
        if (dbOp != null) {
            toRet.dbOp = (DBQueryOperation) dbOp.clone(this);
        }
        return toRet;
    }

    /**
     * Called from {@link DBQueryOperation#clone()}
     *
     * @param caller - our DBQueryOperation which has ALREADY BEEN CLONED
     */
    Object clone(DBQueryOperation caller) {
        assert(searcher == null);
        LuceneQueryOperation toRet = cloneInternal();
        toRet.setDBOperation(caller);
        return toRet;
    }

    /**
     * Must be called AFTER the first results chunk is fetched.
     *
     * @return number of hits in this search
     */
    @Override
    public long getTotalHitCount() {
        return hits != null ? hits.totalHits : 0;
    }

    @Override
    public long getCursorOffset() {
        return -1;
    }

    /**
     * Reset our hit iterator back to the beginning of the result set.
     */
    void resetDocNum() {
        curHitNo = 0;
    }

    @Override
    protected QueryOperation combineOps(QueryOperation other, boolean union) {
        assert(!haveRunSearch);

        if (union) {
            if (other.hasNoResults()) {
                queryInfo.addAll(other.getResultInfo());
                // a query for (other OR nothing) == other
                return this;
            }
        } else {
            if (other.hasAllResults()) {
                if (other.hasSpamTrashSetting()) {
                    forceHasSpamTrashSetting();
                }
                queryInfo.addAll(other.getResultInfo());
                // we match all results.  (other AND anything) == other
                return this;
            }
        }

        if (other instanceof LuceneQueryOperation) {
            LuceneQueryOperation otherLuc = (LuceneQueryOperation) other;
            if (union) {
                queryString = '(' + queryString + ") OR (" + otherLuc.queryString + ')';
            } else {
                queryString = '(' + queryString + ") AND (" + otherLuc.queryString + ')';
            }

            BooleanQuery top = new BooleanQuery();
            BooleanClause lhs = new BooleanClause(luceneQuery, union ? Occur.SHOULD : Occur.MUST);
            BooleanClause rhs = new BooleanClause(otherLuc.luceneQuery, union ? Occur.SHOULD : Occur.MUST);
            top.add(lhs);
            top.add(rhs);
            luceneQuery = top;
            queryInfo.addAll(other.getResultInfo());
            return this;
        }
        return null;
    }

    @Override
    void forceHasSpamTrashSetting() {
        hasSpamTrashSetting = true;
    }

    List<QueryInfo> getQueryInfo() {
        return queryInfo;
    }

    @Override
    boolean hasSpamTrashSetting() {
        return hasSpamTrashSetting;
    }

    @Override
    boolean hasNoResults() {
        return false;
    }

    @Override
    boolean hasAllResults() {
        return false;
    }

    @Override
    QueryOperation expandLocalRemotePart(Mailbox mbox) throws ServiceException {
        return this;
    }

    @Override
    QueryOperation ensureSpamTrashSetting(Mailbox mbox, boolean includeTrash, boolean includeSpam) throws ServiceException {
        // wrap ourselves in a DBQueryOperation, since we're eventually going to need to go to the DB
        DBQueryOperation dbOp = new DBQueryOperation();
        dbOp.setLuceneQueryOperation(this);
        return dbOp.ensureSpamTrashSetting(mbox, includeTrash, includeSpam);
    }

    @Override
    QueryTargetSet getQueryTargets() {
        QueryTargetSet toRet = new QueryTargetSet(1);
        toRet.add(QueryTarget.UNSPECIFIED);
        return toRet;
    }

    void setDBOperation(DBQueryOperation op) {
        dbOp = op;
    }

    @Override
    public void resetIterator() throws ServiceException {
        if (dbOp != null) {
            dbOp.resetIterator();
        }
    }

    @Override
    public ZimbraHit getNext() throws ServiceException {
        if (dbOp != null) {
            return dbOp.getNext();
        }
        return null;
    }

    @Override
    public ZimbraHit peekNext() throws ServiceException {
        if (dbOp != null) {
            return dbOp.peekNext();
        }
        return null;
    }

    @Override
    public List<QueryInfo> getResultInfo() {
        List<QueryInfo> toRet = new ArrayList<QueryInfo>();
        toRet.addAll(queryInfo);
        if (dbOp != null) {
            toRet.addAll(dbOp.getQueryInfo());
        }
        return toRet;
    }

    @Override
    QueryOperation optimize(Mailbox mbox) {
        return this;
    }

    /**
     * Helper for implementing QueryOperation.depthFirstRecurse(RecurseCallback)
     */
    void depthFirstRecurseInternal(RecurseCallback cb) {
        cb.recurseCallback(this);
    }

    @Override
    protected void depthFirstRecurse(RecurseCallback cb) {
        if (dbOp != null) {
            dbOp.depthFirstRecurse(cb);
        } else {
            depthFirstRecurseInternal(cb);
        }
    }


    /**
     * Allows the parser (specifically the Query subclasses) to store some query
     * result information so that it can be returned to the caller after the
     * query has run. This is used for things like spelling suggestion
     * correction, or wildcard expansion info: things that are not results
     * per-se but still need to have some way to be sent back to the caller.
     */
    public void addQueryInfo(QueryInfo inf) {
        queryInfo.add(inf);
    }

    /**
     * Can be called more than once recursively from {@link DBQueryOperation}.
     */
    @Override
    protected final void begin(QueryContext ctx) throws ServiceException {
        assert(!haveRunSearch);
        context = ctx;
        if (dbOp == null) { // 1st time called
            // wrap ourselves in a DBQueryOperation, since we're eventually
            // going to need to go to the DB
            dbOp = new DBQueryOperation();
            dbOp.setLuceneQueryOperation(this);
            dbOp.begin(ctx); // will call back into this method again!
        } else { // 2nd time called
            try {
                searcher = ctx.getMailbox().index.getIndexStore().openSearcher();
            } catch (IOException e) {
                throw ServiceException.FAILURE("Failed to open searcher", e);
            }
            sort = toLuceneSort(ctx.getResults().getSortBy());
        }
    }

    private Sort toLuceneSort(SortBy sortBy) {
        if (sortBy == null) {
            return null;
        }

        switch (sortBy.getKey()) {
            case NONE:
                return null;
            case NAME:
            case NAME_NATURAL_ORDER:
            case SENDER:
                return new Sort(new SortField(LuceneFields.L_SORT_NAME, SortField.STRING,
                        sortBy.getDirection() == SortBy.Direction.DESC));
            case SUBJECT:
                return new Sort(new SortField(LuceneFields.L_SORT_SUBJECT, SortField.STRING,
                        sortBy.getDirection() == SortBy.Direction.DESC));
            case SIZE:
                return new Sort(new SortField(LuceneFields.L_SORT_SIZE, SortField.LONG,
                        sortBy.getDirection() == SortBy.Direction.DESC));
            case RCPT:
            case ATTACHMENT:
            case FLAG:
            case PRIORITY:
                assert false : sortBy; // should already be checked in the compile phase
            case DATE:
            default: // default to DATE_DESCENDING
                return new Sort(new SortField(LuceneFields.L_SORT_DATE, SortField.STRING, true));
        }
    }

    /**
     * We use this data structure to track a "chunk" of Lucene hits which the {@link DBQueryOperation} will use to check
     * against the DB.
     */
    static final class LuceneResultsChunk {
        private Multimap<Integer, Document> hits = LinkedHashMultimap.create();

        Set<Integer> getIndexIds() {
            return hits.keySet();
        }

        int size() {
            return hits.size();
        }

        void addHit(int indexId, Document doc) {
            hits.put(indexId, doc);
        }

        Collection<Document> getHit(int indexId) {
            return hits.get(indexId);
        }
    }

}
