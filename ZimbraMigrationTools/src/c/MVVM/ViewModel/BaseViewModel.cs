﻿namespace MVVM.ViewModel
{
    using System.ComponentModel;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Input;
    using MVVM.Model;
    using System.Xml.Linq;
    using System.Xml;
    using System;
    using System.IO;
    using System.Diagnostics;

    public class BaseViewModel : INotifyPropertyChanged
    {
        public enum ViewType
        {
            INTRO,
            SVRSRC,
            USRSRC,
            SVRDEST,
            USRDEST,
            OPTIONS,
            USERS,
            SCHED,
            RESULTS,
            MAX
        }

        public event PropertyChangedEventHandler PropertyChanged;

        public Config m_config = new Config("", "", "", "", "", "", "", "", "", "", "");
        public void OnPropertyChanged(PropertyChangedEventArgs e)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, e);
            }
        }

        public string Name { get; set; }
        public string ViewTitle { get; set; }
        public string ImageName { get; set; }
        public ListBox lb { get; set; }
        public static bool isServer { get; set; }
        public bool isBrowser { get; set; }

        public static Object[] ViewModelPtrs = new Object[(int)ViewType.MAX];

        public void UpdateXmlElement(string XmlfileName, string XmlelementName)
        {

            System.Xml.Serialization.XmlSerializer xmlSerializer = new System.Xml.Serialization.XmlSerializer(typeof(MVVM.Model.Config));
            System.IO.StringWriter stringWriter = new System.IO.StringWriter();
            System.Xml.XmlWriter xmlWriter = new System.Xml.XmlTextWriter(stringWriter);
            xmlSerializer.Serialize(xmlWriter, m_config);

            string newSourceXml = stringWriter.ToString();
            XElement newSourceTypeElem = XElement.Parse(newSourceXml);
            XElement newimport = newSourceTypeElem.Element((XName)XmlelementName);

            XmlDocument xmlDoc = new XmlDocument();
            xmlDoc.PreserveWhitespace = true;

            try
            {
                xmlDoc.Load(XmlfileName);
            }
            catch (XmlException e)
            {
                Console.WriteLine(e.Message);
            }
            // Now create StringWriter object to get data from xml document.
            StringWriter sw = new StringWriter();
            XmlTextWriter xw = new XmlTextWriter(sw);
            xmlDoc.WriteTo(xw);

            string SourceXml = sw.ToString();

            //Replace the current view xml Sources node with the new one
            XElement viewXmlElem = XElement.Parse(SourceXml);
            XElement child = viewXmlElem.Element((XName)XmlelementName);
            //viewXmlElem.Element("importOptions").ReplaceWith(newSourcesElem);
            child.ReplaceWith(newimport);

            xmlDoc.LoadXml(viewXmlElem.ToString());
            xmlDoc.Save(XmlfileName);       
        }

        protected void DoHelp(string htmlFile)
        {
            string fileName;
            string urlString;
            bool bDoProcess;
            if (isBrowser)
            {
                fileName = urlString = "http://W764IIS.prom.eng.vmware.com/" + htmlFile;
                bDoProcess = true; // too lazy to check if xbap
            }
            else
            {
                fileName = ((IntroViewModel)ViewModelPtrs[(int)ViewType.INTRO]).InstallDir;
                fileName += "/";
                fileName += htmlFile;
                urlString = "file:///" + fileName;
                bDoProcess = File.Exists(fileName);
            }

            if (bDoProcess)
            {
                Process.Start(new ProcessStartInfo(urlString));
            }
            else
            {
                MessageBox.Show("Help file not found", "Open file error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    } 
}
