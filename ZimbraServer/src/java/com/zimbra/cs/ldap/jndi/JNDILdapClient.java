package com.zimbra.cs.ldap.jndi;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.ldap.LdapClient;
import com.zimbra.cs.ldap.LdapException;
import com.zimbra.cs.ldap.LdapServerType;
import com.zimbra.cs.ldap.ZLdapContext;
import com.zimbra.cs.ldap.ZTransientEntry;
import com.zimbra.cs.ldap.ZSearchControls.ZSearchControlsFactory;
import com.zimbra.cs.ldap.ZSearchScope.ZSearchScopeFactory;

public class JNDILdapClient extends LdapClient {
    @Override
    protected void init() throws LdapException {
        super.init();
    }
    
    @Override 
    protected ZSearchScopeFactory getSearchScopeFactoryImpl() {
        return new JNDISearchScope.JNDISearchScopeFactory();
    }
    
    @Override
    protected ZSearchControlsFactory getSearchControlsFactoryImpl() {
        return new JNDISearchControls.JNDISearchControlsFactory();
    }
    
    @Override
    protected ZLdapContext getContextImpl(LdapServerType serverType) throws ServiceException {
        return new JNDILdapContext(serverType);
    }
    
    @Override
    protected ZLdapContext getContextImpl(LdapServerType serverType, boolean useConnPool) throws ServiceException {
        return new JNDILdapContext(serverType, useConnPool);
    }

    @Override
    protected ZTransientEntry newTransientEntryImpl() {
        return new JNDITransientEntry();
    }

}
