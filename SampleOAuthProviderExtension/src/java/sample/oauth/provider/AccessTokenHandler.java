/*
 * Copyright 2009 Yutaka Obuchi
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Original is from example in OAuth Java library(http://oauth.googlecode.com/svn/code/java/)
// and modified for integratin with Zimbra

// Original's copyright and license terms
/*
 * Copyright 2007 AOL, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package sample.oauth.provider;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.account.AuthToken;
import com.zimbra.cs.account.AuthTokenException;
import com.zimbra.cs.account.ZimbraAuthToken;
import com.zimbra.cs.extension.ExtensionHttpHandler;
import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.MailboxManager;
import com.zimbra.cs.mailbox.Metadata;
import com.zimbra.cs.mailbox.MetadataList;
import net.oauth.OAuth;
import net.oauth.OAuthAccessor;
import net.oauth.OAuthMessage;
import net.oauth.OAuthProblemException;
import net.oauth.server.OAuthServlet;
import sample.oauth.provider.core.SampleZmOAuthProvider;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Access Token request handler for zimbra extension
 *
 * @author Yutaka Obuchi
 */
public class AccessTokenHandler extends ExtensionHttpHandler {
    
    
    public void init(ZimbraExtension ext) throws ServiceException{
        super.init(ext);    
    }
    
    public String getPath() {
        return super.getPath() + "/access_token";
    }
    
    public void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
    	ZimbraLog.extensions.debug("Access Token Handler doGet requested!");
        processRequest(request, response);
    }
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
    	ZimbraLog.extensions.debug("Access Token Handler doPost requested!");
        processRequest(request, response);
    }
        
    public void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        try{
            OAuthMessage oAuthMessage = OAuthServlet.getMessage(request, null);
            
            OAuthAccessor accessor = SampleZmOAuthProvider.getAccessor(oAuthMessage);
            SampleZmOAuthProvider.VALIDATOR.validateAccTokenMessage(oAuthMessage, accessor);
            
            // make sure token is authorized
            if (!Boolean.TRUE.equals(accessor.getProperty("authorized"))) {
                 OAuthProblemException problem = new OAuthProblemException("permission_denied");
                 ZimbraLog.extensions.debug("permission_denied");
                 throw problem;
            }
            // generate access token and secret
            SampleZmOAuthProvider.generateAccessToken(accessor);
            
            persistConsumerKeyInMbox(accessor);

            response.setContentType("text/plain");
            OutputStream out = response.getOutputStream();
            OAuth.formEncode(OAuth.newList("oauth_token", accessor.accessToken,
                                           "oauth_token_secret", accessor.tokenSecret),
                             out);
            out.close();
        } catch (Exception e){
            SampleZmOAuthProvider.handleException(e, request, response, true);
        }
    }

    private static void persistConsumerKeyInMbox(OAuthAccessor accessor) throws AuthTokenException, ServiceException {
        AuthToken userAuthToken = ZimbraAuthToken.getAuthToken((String) accessor.getProperty("ZM_AUTH_TOKEN"));
        Mailbox mbox = MailboxManager.getInstance().getMailboxByAccountId(userAuthToken.getAccountId());
        Metadata oAuthConfig = mbox.getConfig(null, "zwc:oauth");
        if (oAuthConfig == null)
            oAuthConfig = new Metadata();
        MetadataList authzedConsumers = oAuthConfig.getList("authorized_consumers", true);
        if (authzedConsumers == null) {
            authzedConsumers = new MetadataList();
        } else if (authzedConsumers.asList().contains(accessor.consumer.consumerKey)) {
            // consumer is already present in the list of authzed consumers
            return;
        }
        authzedConsumers.add(accessor.consumer.consumerKey);
        oAuthConfig.put("authorized_consumers", authzedConsumers);
        mbox.setConfig(null, "zwc:oauth", oAuthConfig);
    }

    private static final long serialVersionUID = 1L;

}
