package com.zimbra.cs.offline;

import java.io.IOException;
import java.util.List;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.SystemUtil;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.account.offline.OfflineDataSource;
import com.zimbra.cs.datasource.CalDavDataImport;
import com.zimbra.cs.dav.DavException;
import com.zimbra.cs.dav.client.CalDavClient;
import com.zimbra.cs.mailbox.OfflineServiceException;
import com.zimbra.cs.offline.OfflineLog;

public class OfflineCalDavDataImport extends CalDavDataImport {
    private static final String CALDAV_TARGET_URL = "calDavTargetUrl";
    private static final String CALDAV_PRINCIPAL_PATH = "calDavPrincipalPath";
    
    public OfflineCalDavDataImport(DataSource ds) throws ServiceException {
        super(ds);
    }
    
    public static void loginTest(String username, String password, String serviceName) throws IOException, ServiceException {
        try {
            OfflineDataSource.KnownService ks = OfflineDataSource.getKnownServiceByName(serviceName);
            String url, path;                        
            if (ks != null && ks.attrs != null && (url = ks.attrs.get(CALDAV_TARGET_URL)) != null &&
                (path = ks.attrs.get(CALDAV_PRINCIPAL_PATH)) != null) {
                OfflineLog.offline.debug("offline caldav login test: url=" + url + " path=" + path);
                CalDavClient client = new CalDavClient(url);
                client.setCredential(username, password);
                client.login(path.replaceAll("@USERNAME@", username));
            } else {
                throw new DavException("offline caldav login test: missing caldav parameters for " + serviceName, 599);
            }
        } catch (DavException x) {
            doCalDavFailures(serviceName, x);
        }
    }
    
    public void importData(String serviceName, List<Integer> folderIds, boolean fullSync) throws ServiceException {
    	try {
    		super.importData(folderIds, fullSync);
    	} catch (ServiceException x) {
    		Throwable t = SystemUtil.getInnermostException(x);
    		if (t instanceof DavException)
    			doCalDavFailures(serviceName, (DavException)t);
    		throw x;
    	}
    }
    
    private static void doCalDavFailures(String serviceName, DavException x) throws ServiceException {
		int status = x.getStatus();
        if (status == 502 && serviceName.equals("yahoo.com")) {
            throw OfflineServiceException.YCALDAV_NEED_UPGRADE();
        } else if (status == 404 && serviceName.equals("gmail.com")) {
            throw OfflineServiceException.GCALDAV_NEED_ENABLE();
        } else {
            OfflineLog.offline.debug("caldav login failed: service=%s; status=%d", serviceName, status);
            throw OfflineServiceException.CALDAV_LOGIN_FAILED();
        }
    }
    
    @Override
    protected String getTargetUrl() {
        OfflineDataSource.KnownService ks = ((OfflineDataSource)dataSource).getKnownService();
        return (ks != null && ks.attrs != null) ? ks.attrs.get(CALDAV_TARGET_URL) : null;
    }
    
    @Override
    protected String getPrincipalUrl() {
        OfflineDataSource.KnownService ks = ((OfflineDataSource)dataSource).getKnownService();        
        if (ks == null || ks.attrs == null)
            return null;               
        
        String path = ks.attrs.get(CALDAV_PRINCIPAL_PATH);
        if (path == null)
            return null;
        
        return path.replaceAll("@USERNAME@", dataSource.getUsername());
    }
}
