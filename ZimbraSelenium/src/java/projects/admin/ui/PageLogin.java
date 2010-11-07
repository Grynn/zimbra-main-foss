package projects.admin.ui;

import framework.ui.AbsApplication;
import framework.util.HarnessException;
import framework.util.ZimbraAccount;
import framework.util.ZimbraAdminAccount;

/**
 * This class defines the login page
 * @author Matt Rhoades
 *
 */
public class PageLogin extends AbsAdminPage {
	
	public static class Locators {
		
		public static final String zLoginDialog = "xpath=//div[@class='ZaLoginDialog']";
		public static final String zLoginUserName = "xpath=//*[@id='ZLoginUserName']";
		public static final String zLoginPassword = "xpath=//*[@id='ZLoginPassword']";
		public static final String zLoginButtonContainer = "xpath=//*[@id='ZLoginButton']";
		public static final String zLoginLicenseContainer = "xpath=//*[@id='ZLoginLicenseContainer']";
		
	}

	/**
	 * An object that controls the Admin Console Login Page
	 */
	public PageLogin(AbsApplication application) {
		super(application);
		
		logger.info("new " + myPageName());
	}
	
	@Override
	public String myPageName() {
		return (this.getClass().getName());
	}

	/**
	 * If the "Login" button is visible, assume the LoginPage is active
	 */
	public boolean isActive() throws HarnessException {

		// Make sure the application is loaded first
		if ( !MyApplication.isLoaded() )
			throw new HarnessException("Admin Console application is not active!");


		// Look for the login button. 
		boolean present = sIsElementPresent(Locators.zLoginButtonContainer);
		if ( !present ) {
			logger.debug("isActive() present = "+ present);
			return (false);
		}
		
		boolean visible = zIsVisiblePerPosition(Locators.zLoginButtonContainer, 0 , 0);
		if ( !visible ) {
			logger.debug("isActive() visible = "+ visible);
			return (false);
		}
		
		logger.debug("isActive() = "+ true);
		return (true);
	}
		
	@Override
	public void navigateTo() throws HarnessException {
		
		if ( isActive() ) {
			// This page is already active.
			return;
		}
		
		
		// Logout
		if ( MyApplication.zPageMain.isActive() ) {
			MyApplication.zPageMain.logout();
		}
		
		waitForActive();
	}


	/**
	 * Login as the GlobalAdmin
	 * @throws HarnessException
	 */
	public void login() throws HarnessException {
		logger.debug("login()");

		login(ZimbraAdminAccount.AdminConsoleAdmin());
	}
	
	/**
	 * Login as the specified account
	 * @param account
	 * @throws HarnessException
	 */
	public void login(ZimbraAccount account) throws HarnessException {
		logger.debug("login(ZimbraAccount account)" + account.EmailAddress);

		navigateTo();
		
		// Fill out the form
		fillLoginFormFields(account);
		
		// Click the Login button
		sClick(Locators.zLoginButtonContainer);

		// Wait for the app to load
		MyApplication.zPageMain.waitForActive();
		
		MyApplication.setActiveAcount(account);
		
	}
	
	/**
	 * Fill the form with the specified user
	 * @throws HarnessException
	 */
	public void fillLoginFormFields(ZimbraAccount account) throws HarnessException {
		logger.debug("fillFields(ZimbraAccount account)" + account.EmailAddress);
		
		if ( !isActive() )
			throw new HarnessException("LoginPage is not active");
		
		sType(Locators.zLoginUserName, account.EmailAddress);
		sType(Locators.zLoginPassword, account.Password);
	}



}
