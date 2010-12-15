package projects.admin.tests.accounts;

import java.util.List;

import org.testng.annotations.Test;

import projects.admin.core.AdminCommonTest;
import projects.admin.items.AccountItem;
import projects.admin.ui.PageManageAccounts;
import projects.admin.ui.WizardCreateAccount;

import com.zimbra.common.soap.Element;

import framework.items.IItem;
import framework.util.HarnessException;
import framework.util.ZAssert;
import framework.util.ZimbraAdminAccount;

public class CreateAccount extends AdminCommonTest {
	
	public CreateAccount() {
		logger.info("New "+ CreateAccount.class.getCanonicalName());
		
		// All tests start at the "Accounts" page
		super.startingPage = app.zPageManageAccounts;

	}
	
	@Test(	description = "Create a basic account",
			groups = { "sanity" })
	public void CreateAccount_01() throws HarnessException {

		// Create a new account in the Admin Console
		AccountItem account = new AccountItem();
		
		// Use the default Create Account method
		app.zPageManageAccounts.createAccount(account);
		
		// Verify the account exists in the ZCS
		ZimbraAdminAccount.AdminConsoleAdmin().soapSend(
				"<GetAccountRequest xmlns='urn:zimbraAdmin'>" +
					"<account by='name'>"+ account.EmailAddress +"</account>" +
				"</GetAccountRequest>");
		Element response = ZimbraAdminAccount.AdminConsoleAdmin().soapSelectNode("//admin:GetAccountResponse", 1);
		ZAssert.assertNotNull(response, "Verify the account is created successfully");
		
		// Verify the account exists in the Account list
		List<IItem> accounts = app.zPageSearchResults.getSearchResults(account.EmailAddress);
		ZAssert.assertTrue(accounts.contains(account), "Verify the new account appears in the list");

	}

	@Test(	description = "Create a basic account using New",
			groups = { "smoke" })
	public void CreateAccount_02() throws HarnessException {

		// Create a new account in the Admin Console
		AccountItem account = new AccountItem();
				
		WizardCreateAccount wizard = 
			app.zPageManageAccounts.getNewAccountWizard(PageManageAccounts.Locators.zb__ACLV__NEW_MENU_title);
		wizard.zCompleteWizard(account);
		
		// Verify the account exists in the ZCS
		ZimbraAdminAccount.AdminConsoleAdmin().soapSend(
				"<GetAccountRequest xmlns='urn:zimbraAdmin'>" +
					"<account by='name'>"+ account.EmailAddress +"</account>" +
				"</GetAccountRequest>");
		Element response = ZimbraAdminAccount.AdminConsoleAdmin().soapSelectNode("//admin:GetAccountResponse", 1);
		ZAssert.assertNotNull(response, "Verify the account is created successfully");

		// Verify the account exists in the Account list
		List<IItem> accounts = app.zPageSearchResults.getSearchResults(account.EmailAddress);
		ZAssert.assertTrue(accounts.contains(account), "Verify the new account appears in the list");

	}

	@Test(	description = "Create a basic account using New->Account",
			groups = { "smoke" })
	public void CreateAccount_03() throws HarnessException {

		// Create a new account in the Admin Console
		AccountItem account = new AccountItem();
				
		WizardCreateAccount wizard = 
			app.zPageManageAccounts.getNewAccountWizard(PageManageAccounts.Locators.zmi__ACLV__NEW_WIZARD_title);
		wizard.zCompleteWizard(account);

		// Verify the account exists in the ZCS
		ZimbraAdminAccount.AdminConsoleAdmin().soapSend(
				"<GetAccountRequest xmlns='urn:zimbraAdmin'>" +
					"<account by='name'>"+ account.EmailAddress +"</account>" +
				"</GetAccountRequest>");
		Element response = ZimbraAdminAccount.AdminConsoleAdmin().soapSelectNode("//admin:GetAccountResponse", 1);
		ZAssert.assertNotNull(response, "Verify the account is created successfully");

		// Verify the account exists in the Account list
		List<IItem> accounts = app.zPageSearchResults.getSearchResults(account.EmailAddress);
		ZAssert.assertTrue(accounts.contains(account), "Verify the new account appears in the list");

	}


}
