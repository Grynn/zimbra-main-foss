package projects.ajax.tests.briefcase.document;

import org.testng.annotations.Test;

import projects.ajax.core.AjaxCommonTest;
import projects.ajax.ui.DocumentBriefcaseNew;
import projects.ajax.ui.PageBriefcase.Locators;
import framework.core.ClientSessionFactory;
import framework.items.DocumentItem;
import framework.ui.Button;
import framework.util.HarnessException;
import framework.util.SleepUtil;
import framework.util.ZAssert;
import framework.util.ZimbraAccount;

public class CreateDocument extends AjaxCommonTest {

	public CreateDocument() {
		logger.info("New " + CreateDocument.class.getCanonicalName());

		super.startingPage = app.zPageBriefcase;

		ZimbraAccount account = new ZimbraAccount();
		account.provision();
		account.authenticate();
		super.startingAccount = account;

	}

	@Test(description = "Create document through GUI - verify through SOAP", groups = { "sanity" })
	public void CreateDocument_01() throws HarnessException {

		// Create document item
		DocumentItem document = new DocumentItem();

		// Select Briefcase tab
		SleepUtil.sleepSmall();
		app.zPageBriefcase.zNavigateTo();

		// Open new document page
		DocumentBriefcaseNew documentBriefcaseNew = (DocumentBriefcaseNew) app.zPageBriefcase
				.zToolbarPressButton(Button.O_NEW_DOCUMENT);

		// Fill out the document with the data
		documentBriefcaseNew.zFill(document);

		// Save and close
		documentBriefcaseNew.zSubmit();

		documentBriefcaseNew.zSelectWindow("Zimbra: Briefcase");

		ZimbraAccount account = app.zGetActiveAccount();

		// Verify document name through SOAP
		app.zGetActiveAccount().soapSend(

		"<SearchRequest xmlns='urn:zimbraMail' types='document'>" +

		"<query>" + document.getDocName() + "</query>" +

		"</SearchRequest>");

		String name = app.zGetActiveAccount().soapSelectValue("//mail:doc",
				"name");

		ZAssert.assertEquals(document.getDocName(), name,
				" Verify document name through SOAP");
		/*
		*/
	}
}
