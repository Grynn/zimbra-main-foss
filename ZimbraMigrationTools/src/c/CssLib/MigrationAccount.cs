﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Collections.ObjectModel;

namespace CssLib
{
    public class MigrationAccount
    {
        public MigrationAccount()
        {
            Accountname = "";
            Accountnum = -1;

            migrationFolders = new List<MigrationFolder>();
        }

     	private string AccountName;
        private int AccountNum;

        private Int64 TotalMails;
        private Int64 TotalContacts;
        private Int64 TotalRules;
        private Int64 TotalAppointments;
        private Int64 TotalTasks;
        private Int64 TotalSent;
        private Int64 TotalItems;

        public List<MigrationFolder> migrationFolders;

        /*public MigrationFolder MigrationFolders
        {
            get { return migrationFolders[10]; }
            set { migrationFolders = value; }
        }*/

		private System.DateTime dtmDateRaised;

		public event MigrationObjectEventHandler OnChanged;

        public Int64 TotalNoItems
        {
            get { return TotalItems; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalNoTasks", this.TotalItems, value));
                }
                TotalItems = value;
            }
        }

        public Int64 TotalNoTasks
        {
            get { return TotalTasks; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalNoTasks", this.TotalTasks, value));
                }
                TotalTasks = value;
            }
        }
        public Int64 TotalNoSent
        {
            get { return TotalSent; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalNoContacts", this.TotalSent, value));
                }
                TotalSent = value;
            }
        }

		public string Accountname
		{
			get
			{
				return this.AccountName;
			}
			set
			{
				if (OnChanged != null)
				{
					OnChanged(this, new MigrationObjectEventArgs("AccountID", this.AccountName, value));
				}
				this.AccountName = value;
			}
		}
        public int Accountnum
        {
            get
            {
                return this.AccountNum;
            }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("AccountNum", this.AccountNum, value));
                }
                this.AccountNum = value;
            }
        }
        public Int64 TotalNoMails
        {
            get { return TotalMails; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalNoMails", this.TotalMails, value));
                }
                TotalMails = value;
            }
        }
        public Int64 TotalNoContacts
        {
            get { return TotalContacts; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalNoContacts", this.TotalContacts, value));
                }
                TotalContacts = value;
            }
        }
        public Int64 TotalNoRules
        {
            get { return TotalRules; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalRules", this.TotalRules, value));
                }
                TotalRules = value;
            }
        }
        public Int64 TotalNoAppointments
        {
            get { return TotalAppointments; }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("TotalNoAppointments", this.TotalAppointments, value));
                }
                TotalAppointments = value;
            }
        }

		public System.DateTime dateRaised
		{
			get
			{
				return this.dtmDateRaised;
			}
			set
			{
				if (OnChanged != null)
				{
					OnChanged(this, new MigrationObjectEventArgs("dateRaised", this.dtmDateRaised, value));
				}
				this.dtmDateRaised = value;
			}
		}

	}
    public class MigrationFolder
    {
        public event MigrationObjectEventHandler OnChanged;
        private string strFolderName;

        public string FolderName
        {
          get { return strFolderName; }
          set { 
              if (OnChanged != null)
				{
					OnChanged(this, new MigrationObjectEventArgs("FolderName", this.FolderName, value));
                    TotalCountofItems = 0;
                    CurrentCountofItems = 0;
				}
              strFolderName = value; }
        }
        private Int64 TotalCountofItems;

        public Int64 TotalCountOFItems
        {
          get { return TotalCountofItems; }
          set { 
              if (OnChanged != null)
				{
					OnChanged(this, new MigrationObjectEventArgs("TotalCountOFItems", this.TotalCountofItems, value));
				}
              TotalCountofItems = value; }
        }

        private Int64  CurrentCountofItems;

        public Int64 CurrentCountOFItems
        {
          get { return CurrentCountofItems; }
          set { 
              if (OnChanged != null)
				{
					OnChanged(this, new MigrationObjectEventArgs("CurrentCountofItems", this.CurrentCountofItems, value));
				}
              CurrentCountofItems = value;
          }
        }

        private int AccountNum;
        public int Accountnum
        {
            get
            {
                return this.AccountNum;
            }
            set
            {
                if (OnChanged != null)
                {
                    OnChanged(this, new MigrationObjectEventArgs("AccountNum", this.AccountNum, value));
                }
                this.AccountNum = value;
            }
        }
       /* private string statusMessage;
        private string errorMessage;*/
        public MigrationFolder()
		{
            /*FolderName = "";
            TotalCountofItems = 0;
            CurrentCountOFItems=0;*/
		}



    }

  
	public class MigrationObjectEventArgs : EventArgs 
	{
		private string strPropertyName;
		private object objOldValue;
		private object objNewValue;

		public MigrationObjectEventArgs(string PropertyName, object OldValue, object NewValue)
		{
			this.strPropertyName = PropertyName;
			this.objOldValue = OldValue;
			this.objNewValue = NewValue;
		}

		public string PropertyName
		{
			get
			{
				return this.strPropertyName;
			}
		}

		public object OldValue
		{
			get
			{
				return this.objOldValue;
			}
		}

		public object NewValue
		{
			get
			{
				return this.objNewValue;
			}
		}
	}

	public delegate void MigrationObjectEventHandler(object sender, MigrationObjectEventArgs e);

   
}

    //}
//}
