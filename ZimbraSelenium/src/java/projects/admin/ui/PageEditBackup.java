/**
 * 
 */
package projects.admin.ui;

import framework.ui.AbsApplication;
import framework.util.HarnessException;

/**
 * @author Matt Rhoades
 *
 */
public class PageEditBackup extends AbsAdminPage {

	public PageEditBackup(AbsApplication application) {
		super(application);
		// TODO Auto-generated constructor stub
	}

	/* (non-Javadoc)
	 * @see projects.admin.ui.AbsAdminPage#isActive()
	 */
	@Override
	public boolean zIsActive() throws HarnessException {
		throw new HarnessException("implement me");
	}

	/* (non-Javadoc)
	 * @see projects.admin.ui.AbsAdminPage#myPageName()
	 */
	@Override
	public String myPageName() {
		return (this.getClass().getName());
	}

	/* (non-Javadoc)
	 * @see projects.admin.ui.AbsAdminPage#navigateTo()
	 */
	@Override
	public void zNavigateTo() throws HarnessException {
		throw new HarnessException("implement me");
	}

}
