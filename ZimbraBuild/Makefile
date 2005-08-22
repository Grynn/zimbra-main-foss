# Makefile for entire install tree, for RPM packages.

.PHONY: core mta store ldap snmp qatest

# BASE VARIABLES

BUILD_ROOT	:= $(shell pwd)

BUILD_PLATFORM := $(shell sh $(BUILD_ROOT)/rpmconf/Build/get_plat_tag.sh)

MAJOR	:= 2
MINOR	:= 0

ifeq ($(TAG), )
	TAG := HEAD
else
	TAG	:= $(shell echo $$TAG)
endif

HOST	:= $(shell hostname)
DATE	:= $(shell date +%Y%m%d%H%M%S)
ifeq ($(RELEASE), )
	RELEASE	:= $(DATE)_$(TAG)
else
	 RELEASE := $(RELEASE)_$(TAG)
	 DATE	:= $(RELEASE)
endif

USER := $(shell id -un)

# ENV

DEV_INSTALL_ROOT := /opt/zimbra

# TARGETS

DEV_CLEAN_TARGETS := \
	$(DEV_INSTALL_ROOT)/$(LDAP_DIR) \
	$(DEV_INSTALL_ROOT)/$(MYSQL_DIR) \
	$(DEV_INSTALL_ROOT)/$(TOMCAT_DIR) \

CLEAN_TARGETS	=	\
		$(QA_DEST_ROOT) \
		$(MTA_DEST_ROOT) \
		$(STORE_DEST_ROOT) \
		$(LDAP_DEST_ROOT) \
		$(SNMP_DEST_ROOT) \
		$(CORE_DEST_ROOT) \
		zcs \
		zcs-2*.tgz \
		zimbra.rpmrc \
		zimbracore.spec \
		zimbrasnmp.spec \
		zimbra.spec \
		zimbraqa.spec \
		zimbramta.spec \
		zimbraldap.spec \
		i386

# EXECUTABLES

PERL 	:= $(shell which perl)

ANT		:= $(shell which ant)

# SOURCE PATHS

QA_DIR	:= $(BUILD_ROOT)/../ZimbraQA
SERVICE_DIR	:= $(BUILD_ROOT)/../ZimbraServer
CONSOLE_DIR	:= $(BUILD_ROOT)/../ZimbraWebClient

BACKUP_DIR  := $(BUILD_ROOT)/../ZimbraBackup
CONVERT_DIR	:= $(BUILD_ROOT)/../ZimbraConvertd

# 3rd PARTY INCLUDES

THIRD_PARTY	:= $(BUILD_ROOT)/../ThirdParty

LDAP_VERSION	:= 2.2.26
LDAP_DIR	:= openldap-$(LDAP_VERSION)
LDAP_SOURCE	:= $(THIRD_PARTY)/openldap/builds/$(LDAP_DIR)

BDB_VERSION	:= 4.2.52.2
BDB_DIR		:= sleepycat-$(BDB_VERSION)
BDB_SOURCE	:= $(THIRD_PARTY)/sleepycat/builds/$(BDB_DIR)

TOMCAT_VERSION	:= 5.5.7
TOMCAT_DIR	:= jakarta-tomcat-$(TOMCAT_VERSION)
TOMCAT_SOURCE 	:= $(THIRD_PARTY)/jakarta-tomcat/$(TOMCAT_DIR)

MYSQL_VERSION	:= standard-4.1.10a-pc-linux-gnu-i686
MYSQL_DIR	:= mysql-$(MYSQL_VERSION)
MYSQL_SOURCE 	:= $(THIRD_PARTY)/mysql/$(MYSQL_DIR)

POSTFIX_VERSION := 2.2.3
POSTFIX_DIR	:= postfix-$(POSTFIX_VERSION)
POSTFIX_SOURCE	:= $(THIRD_PARTY)/PostFix/PostFix-$(POSTFIX_VERSION)/builds/$(POSTFIX_DIR)

RRD_VERSION	:= 1.0.49
RRD_DIR 	:= rrdtool-$(RRD_VERSION)
RRD_SOURCE	:= $(THIRD_PARTY)/rrdtool/$(RRD_DIR)

MRTG_VERSION	:= 2.10.15
MRTG_DIR 	:= mrtg-$(MRTG_VERSION)
MRTG_SOURCE	:= $(THIRD_PARTY)/mrtg/builds/$(MRTG_DIR)

SNMP_VERSION := 5.1.2
SNMP_DIR	:= snmp-$(SNMP_VERSION)
SNMP_SOURCE	:= $(THIRD_PARTY)/snmp/$(SNMP_DIR)

JAVA_VERSION	:= 1.5.0_04
JAVA_FILE	:= jdk
JAVA_DIR	:= java
JAVA_SOURCE	:= $(THIRD_PARTY)/$(JAVA_DIR)/$(JAVA_FILE)$(JAVA_VERSION)

CLAMAV_VERSION := 0.85.1
CLAMAV_DIR :=  clamav
CLAMAV_SOURCE := $(THIRD_PARTY)/$(CLAMAV_DIR)/builds/clamav-$(CLAMAV_VERSION)

AMAVISD_VERSION := 2.3.1
AMAVISD_DIR :=  amavisd
AMAVISD_SOURCE := $(THIRD_PARTY)/$(AMAVISD_DIR)/amavisd-new-$(AMAVISD_VERSION)

SASL_VERSION := 2.1.21.ZIMBRA
SASL_DIR := cyrus-sasl
SASL_SOURCE := $(THIRD_PARTY)/$(SASL_DIR)/builds/$(SASL_DIR)-$(SASL_VERSION)

VERITY_SOURCE := $(THIRD_PARTY)/verity/linux

PERL_LIB_SOURCE	:= $(THIRD_PARTY)/Perl

# DESTINATIONS

MTA_DEST_ROOT		:= $(BUILD_ROOT)/mtabuild
MTA_DEST_DIR		:= $(MTA_DEST_ROOT)/opt/zimbra

LDAP_DEST_ROOT		:= $(BUILD_ROOT)/ldapbuild
LDAP_DEST_DIR		:= $(LDAP_DEST_ROOT)/opt/zimbra

CORE_DEST_ROOT		:= $(BUILD_ROOT)/corebuild
CORE_DEST_DIR		:= $(CORE_DEST_ROOT)/opt/zimbra

QA_DEST_ROOT		:= $(BUILD_ROOT)/qabuild
QA_DEST_DIR			:= $(QA_DEST_ROOT)/opt/zimbra/qa

SNMP_DEST_ROOT		:= $(BUILD_ROOT)/snmpbuild
SNMP_DEST_DIR		:= $(SNMP_DEST_ROOT)/opt/zimbra

STORE_DEST_ROOT		:= $(BUILD_ROOT)/storebuild
STORE_DEST_DIR		:= $(STORE_DEST_ROOT)/opt/zimbra

WEBAPP_DIR		:= $(STORE_DEST_ROOT)/opt/zimbra/$(TOMCAT_DIR)/webapps
WEBAPP_BUILD_DIR := build/dist/tomcat/webapps

RPM_DIR			:= $(BUILD_ROOT)/i386
RPM_CONF_DIR		:= $(BUILD_ROOT)/rpmconf
ZIMBRA_BIN_DIR		:= $(BUILD_ROOT)/bin

# COMPONENTS

WEBAPPS	:= \
	$(WEBAPP_DIR)/service.war \
	$(WEBAPP_DIR)/zimbraAdmin.war \
	$(WEBAPP_DIR)/zimbra.war 

QA_COMPONENTS	:= \
	$(QA_DEST_DIR) \
	$(QA_DEST_DIR)/scripts \
	$(QA_DEST_DIR)/TestMailRaw 

CORE_COMPONENTS	:= \
	$(CORE_DEST_DIR) \
	$(CORE_DEST_DIR)/db \
	$(CORE_DEST_DIR)/lib \
	$(CORE_DEST_DIR)/bin \
	$(CORE_DEST_DIR)/zimbramon \
	$(CORE_DEST_DIR)/$(JAVA_FILE)$(JAVA_VERSION) \
	$(CORE_DEST_DIR)/conf

MTA_COMPONENTS	:= \
	$(MTA_DEST_DIR)/$(POSTFIX_DIR) \
	$(MTA_DEST_DIR)/$(BDB_DIR) \
	$(MTA_DEST_DIR)/$(AMAVISD_DIR) \
	$(MTA_DEST_DIR)/$(CLAMAV_DIR)  \
	$(MTA_DEST_DIR)/$(SASL_DIR)

STORE_COMPONENTS := \
	$(STORE_DEST_DIR)/$(TOMCAT_DIR) \
	$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/zimbra-native.jar \
	$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/KeyView.jar \
	$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/mail.jar \
	$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/endorsed/zimbra-charset.jar \
	$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/activation.jar \
	$(STORE_DEST_DIR)/$(MYSQL_DIR) \
	$(STORE_DEST_DIR)/verity \
	$(WEBAPPS) \
	$(STORE_DEST_DIR)/libexec 

LDAP_COMPONENTS := \
	$(LDAP_DEST_DIR)/$(LDAP_DIR)  

SNMP_COMPONENTS := \
	$(SNMP_DEST_DIR)/$(SNMP_DIR) 

# ZIMBRA USER ENV

PROFILE_SOURCE		:= $(RPM_CONF_DIR)/Env/zimbra.bash_profile
PROFILE_DEST		:= .bash_profile
ENV_FILE_SOURCE		:= $(RPM_CONF_DIR)/Env/zimbra.bashrc
ENV_FILE_DEST		:= .bashrc
EXRC_SOURCE			:= $(RPM_CONF_DIR)/Env/zimbra.exrc
EXRC_DEST			:= .exrc

JAVA_HOME		:= /usr/local/java
export JAVA_HOME

# PACKAGE TARGETS

all: rpms qa zcs-$(RELEASE).tgz

qa: 
	cd $(QA_DIR);  CLASSPATH=$(SERVICE_DIR)/build/classes $(ANT) jar; 

zcs-$(RELEASE).tgz: rpms
	mkdir -p zcs/packages
	mkdir -p zcs/bin
	mkdir -p zcs/data
	cp -f $(SERVICE_DIR)/build/versions-init.sql zcs/data
	cp $(LDAP_DEST_ROOT)/opt/zimbra/$(LDAP_DIR)/bin/ldapsearch zcs/bin
	cp $(RPM_CONF_DIR)/Install/install.sh zcs
	chmod 755 zcs/install.sh
	cp $(RPM_DIR)/*rpm zcs/packages
	rm -f zcs/packages/zimbra-qatest*
	tar czf zcs-$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)_$(RELEASE).tgz zcs
	cp zcs-$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)_$(RELEASE).tgz $(RPM_DIR)
	(cd $(RPM_DIR); ln -s zcs-$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)_$(RELEASE).tgz zcs.tgz)
	@echo "*** BUILD COMPLETED ***"

rpms: core mta store ldap snmp qatest
	@echo "*** Creating RPMS in $(RPM_DIR)"

# __CORE

core: $(RPM_DIR) core_stage
	cat $(RPM_CONF_DIR)/Spec/zimbracore.spec | \
		sed -e 's/@@VERSION@@/$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)/' \
		| sed -e 's/@@RELEASE@@/$(RELEASE)/' > $(BUILD_ROOT)/zimbracore.spec
	(cd $(CORE_DEST_ROOT); find opt -type f -o -type l -maxdepth 2 \
		| sed -e 's|^|%attr(-, zimbra, zimbra) /|' >> \
		$(BUILD_ROOT)/zimbracore.spec )
	echo "%attr(755, zimbra, zimbra) /opt/zimbra/bin" >> \
		$(BUILD_ROOT)/zimbracore.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/conf" >> \
		$(BUILD_ROOT)/zimbracore.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/db" >> \
		$(BUILD_ROOT)/zimbracore.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/jdk1.5.0_04" >> \
		$(BUILD_ROOT)/zimbracore.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/lib" >> \
		$(BUILD_ROOT)/zimbracore.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/zimbramon" >> \
		$(BUILD_ROOT)/zimbracore.spec
	(cd $(CORE_DEST_ROOT);\
		rpmbuild  --target i386 --quiet --define '_rpmdir $(BUILD_ROOT)' \
		--buildroot=$(CORE_DEST_ROOT) -bb $(BUILD_ROOT)/zimbracore.spec )

core_stage: $(CORE_COMPONENTS)

$(CORE_DEST_DIR):
	mkdir -p $@
	cp $(ENV_FILE_SOURCE) $(CORE_DEST_DIR)/$(ENV_FILE_DEST)
	cp $(PROFILE_SOURCE) $(CORE_DEST_DIR)/$(PROFILE_DEST)
	cp $(EXRC_SOURCE) $(CORE_DEST_DIR)/$(EXRC_DEST)

$(CORE_DEST_DIR)/zimbramon: $(CORE_DEST_DIR)/zimbramon/lib $(CORE_DEST_DIR) 
	@echo "*** Creating zimbramon"
	mkdir -p $@
	cp -R $(ZIMBRA_BIN_DIR)/zmmon $@
	chmod 755 $@/zmmon
	cp -R $(ZIMBRA_BIN_DIR)/zmcontrol $@
	chmod 755 $@/zmcontrol
	cp -R $(RPM_CONF_DIR)/Ctl/zimbra.cf.in $@
	cp -R $(RPM_CONF_DIR)/Ctl/zimbracore.cf $@
	cp -R $(RPM_CONF_DIR)/Ctl/zimbramail.cf $@
	cp -R $(RPM_CONF_DIR)/Ctl/zimbramta.cf $@
	cp -R $(RPM_CONF_DIR)/Ctl/zimbraldap.cf $@
	cp -R $(RPM_CONF_DIR)/Ctl/zimbrasnmp.cf $@
	(cd $(CORE_DEST_DIR)/zimbramon; tar xzf $(MRTG_SOURCE).tgz)
	mkdir -p $(CORE_DEST_DIR)/zimbramon/mrtg/work
	mkdir -p $(CORE_DEST_DIR)/zimbramon/mrtg/conf
	cp $(RPM_CONF_DIR)/Conf/mrtg.cfg $(CORE_DEST_DIR)/zimbramon/mrtg/conf
	cp $(RPM_CONF_DIR)/Env/crontab $(CORE_DEST_DIR)/zimbramon/crontab
	(cd $(CORE_DEST_DIR)/zimbramon; tar xzf $(RRD_SOURCE).tar.gz)

$(CORE_DEST_DIR)/zimbramon/lib:
	mkdir -p $(CORE_DEST_DIR)/zimbramon/lib
	(cd $(CORE_DEST_DIR)/zimbramon/lib; \
	tar xzf $(PERL_LIB_SOURCE)/builds/perllib.tgz)
	cp -R $(BUILD_ROOT)/lib/Zimbra $(CORE_DEST_DIR)/zimbramon/lib

$(CORE_DEST_DIR)/lib: $(WEBAPP_DIR)/service.war $(LDAP_DEST_DIR)/$(LDAP_DIR) $(MTA_DEST_DIR)/$(BDB_DIR)
	mkdir -p $@
	cp -pr $(SERVICE_DIR)/build/dist/lib/* $@
	cp -pr $(LDAP_DEST_DIR)/$(LDAP_DIR)/lib/* $@
	cp -pr $(MTA_DEST_DIR)/$(BDB_DIR)/lib/* $@
	cp -pr $(SERVICE_DIR)/build/dist/lib/* $@
	cp $(THIRD_PARTY)/curl/curl.tgz $@
	cp $(THIRD_PARTY)/idn/idn.tgz $@
	(cd $@; tar xzf $(THIRD_PARTY)/mysql/mysql-standard-4.1.10a-clientlibs.tgz)

$(CORE_DEST_DIR)/jdk1.5.0_04:
	@echo "*** Creating java"
	(cd $(CORE_DEST_DIR); tar xzf $(JAVA_SOURCE).tgz;)

$(CORE_DEST_DIR)/db: $(WEBAPP_DIR)/service.war
	mkdir -p $@
	cp -R $(SERVICE_DIR)/src/db/db.sql $@
	cp -R $(SERVICE_DIR)/src/db/create_database.sql $@
	cp -R $(SERVICE_DIR)/build/versions-init.sql $@

$(CORE_DEST_DIR)/conf:
	mkdir -p $@
	cp $(RPM_CONF_DIR)/Conf/swatchrc $@/swatchrc.in
	cp -R $(SERVICE_DIR)/conf/localconfig.xml $@/localconfig.xml
	grep -vi stats $(SERVICE_DIR)/conf/log4j.properties.production > $@/log4j.properties
	cp $(RPM_CONF_DIR)/Conf/zmssl.cnf.in $@
	cp $(SERVICE_DIR)/conf/amavisd.conf.in $@
	cp $(SERVICE_DIR)/conf/clamd.conf.in $@
	cp $(SERVICE_DIR)/conf/freshclam.conf.in $@
	cp $(SERVICE_DIR)/conf/postfix_header_checks.in $@
	cp $(SERVICE_DIR)/conf/salocal.cf $@
	cp $(SERVICE_DIR)/conf/zmmta.cf $@
	cp $(SERVICE_DIR)/conf/postfix_recipient_restrictions.cf $@
	mkdir -p $@/spamassassin
	cp $(SERVICE_DIR)/conf/spamassassin/* $@/spamassassin

$(CORE_DEST_DIR)/bin:
	mkdir -p $@
	cp -R $(SERVICE_DIR)/build/dist/bin/[a-z]* $@
	cp -R $(CONVERT_DIR)/src/bin/[a-z]* $@
	rm -f $(CORE_DEST_DIR)/bin/zmtransserver.bat
	rm -f $(CORE_DEST_DIR)/bin/ldap
	mv $(CORE_DEST_DIR)/bin/ldap.production $(CORE_DEST_DIR)/bin/ldap
	cp $(ZIMBRA_BIN_DIR)/swatch $@
	cp $(ZIMBRA_BIN_DIR)/zmswatchctl $@
	cp $(ZIMBRA_BIN_DIR)/zmloadstats $@
	cp $(ZIMBRA_BIN_DIR)/zmaggregatestats $@
	cp $(ZIMBRA_BIN_DIR)/zmaggregatestatsdaily $@
	cp $(ZIMBRA_BIN_DIR)/zmgetstats $@
	cp $(ZIMBRA_BIN_DIR)/zmlogrotate $@
	cp $(ZIMBRA_BIN_DIR)/zmsnmpinit $@
	cp $(ZIMBRA_BIN_DIR)/zmgengraphs $@
	cp $(ZIMBRA_BIN_DIR)/zmgensystemwidegraphs $@
	cp $(ZIMBRA_BIN_DIR)/zmfetchstats $@
	cp $(ZIMBRA_BIN_DIR)/zmfetchallstats $@
	cp $(ZIMBRA_BIN_DIR)/zmcreatecert $@
	cp $(ZIMBRA_BIN_DIR)/zmcertinstall $@
	cp $(ZIMBRA_BIN_DIR)/zmroll_catalina.sh $@
	cp $(ZIMBRA_BIN_DIR)/zmtlsctl $@
	cp $(ZIMBRA_BIN_DIR)/zmfixperms.sh $@

# __LDAP

ldap: $(RPM_DIR) ldap_stage
	cat $(RPM_CONF_DIR)/Spec/zimbraldap.spec | \
		sed -e 's/@@VERSION@@/$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)/' \
		| sed -e 's/@@RELEASE@@/$(RELEASE)/' > $(BUILD_ROOT)/zimbraldap.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/openldap-$(LDAP_VERSION)" >> \
		$(BUILD_ROOT)/zimbraldap.spec
	(cd $(LDAP_DEST_ROOT); \
		rpmbuild  --target i386 --quiet --define '_rpmdir $(BUILD_ROOT)' \
		--buildroot=$(LDAP_DEST_ROOT) -bb $(BUILD_ROOT)/zimbraldap.spec )

ldap_stage: $(LDAP_COMPONENTS)

$(LDAP_DEST_DIR):
	mkdir -p $@

$(LDAP_DEST_DIR)/$(LDAP_DIR): $(LDAP_DEST_DIR) 
	@echo "*** Creating openldap"
	(cd $(LDAP_DEST_DIR); tar xzf $(LDAP_SOURCE).tgz;)
	cp $(SERVICE_DIR)/conf/ldap/DB_CONFIG \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/var/openldap-data
	cp $(SERVICE_DIR)/conf/ldap/slapd.conf \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/slapd.conf
	cp $(SERVICE_DIR)/conf/ldap/amavisd.schema \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/schema
	cp $(SERVICE_DIR)/conf/ldap/zimbra.schema \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/schema
	cp $(SERVICE_DIR)/conf/ldap/zimbra.ldif \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/zimbra.ldif
	cp $(SERVICE_DIR)/conf/ldap/zimbra_opensrc_mimehandlers.ldif \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/zimbra_opensrc_mimehandlers.ldif
	cp $(SERVICE_DIR)/build/dist/openldap/etc/openldap/zimbra_mimehandlers.ldif \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/zimbra_mimehandlers.ldif
	cp $(SERVICE_DIR)/conf/ldap/widgets.ldif \
		$(LDAP_DEST_DIR)/$(LDAP_DIR)/etc/openldap/widgets.ldif

# __MTA

mta: $(RPM_DIR) mta_stage
	cat $(RPM_CONF_DIR)/Spec/zimbramta.spec | \
		sed -e 's/@@VERSION@@/$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)/' \
		| sed -e 's/@@RELEASE@@/$(RELEASE)/' > $(BUILD_ROOT)/zimbramta.spec
	(cd $(MTA_DEST_ROOT); find opt -type f -o -type l -maxdepth 2 \
		| sed -e 's|^|%attr(-, zimbra, zimbra) /|' >> \
		$(BUILD_ROOT)/zimbramta.spec )
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/amavisd" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(555, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/bin" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(755, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/db" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/etc/" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/include" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/lib" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/man" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(555, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/sbin" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/clamav-0.85.1/share" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/postfix-2.2.3" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/sleepycat-4.2.52.2" >> \
		$(BUILD_ROOT)/zimbramta.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/cyrus-sasl-2.1.21.ZIMBRA" >> \
		$(BUILD_ROOT)/zimbramta.spec
	(cd $(MTA_DEST_ROOT); \
		rpmbuild  --target i386 --quiet --define '_rpmdir $(BUILD_ROOT)' \
		--buildroot=$(MTA_DEST_ROOT) -bb $(BUILD_ROOT)/zimbramta.spec )

mta_stage: $(MTA_COMPONENTS)

$(MTA_DEST_DIR):
	mkdir -p $@

$(MTA_DEST_DIR)/$(POSTFIX_DIR): $(MTA_DEST_DIR)
	@echo "*** Creating postfix"
	(cd $(MTA_DEST_DIR); tar xzf $(POSTFIX_SOURCE).tgz;)
	cp $(SERVICE_DIR)/conf/postfix/main.cf $(MTA_DEST_DIR)/$(POSTFIX_DIR)/conf/main.cf
	cp $(SERVICE_DIR)/conf/postfix/master.cf $(MTA_DEST_DIR)/$(POSTFIX_DIR)/conf/master.cf

$(MTA_DEST_DIR)/$(CLAMAV_DIR): $(MTA_DEST_DIR)
	@echo "*** Creating clamav"
	(cd $(MTA_DEST_DIR); tar xzf $(CLAMAV_SOURCE).tgz;)
	mkdir -p $(MTA_DEST_DIR)/$(CLAMAV_DIR)-$(CLAMAV_VERSION)/db
	cp $(RPM_CONF_DIR)/ClamAv/main.cvd $(MTA_DEST_DIR)/$(CLAMAV_DIR)-$(CLAMAV_VERSION)/db/main.cvd.init
	cp $(RPM_CONF_DIR)/ClamAv/daily.cvd $(MTA_DEST_DIR)/$(CLAMAV_DIR)-$(CLAMAV_VERSION)/db/daily.cvd.init

$(MTA_DEST_DIR)/$(AMAVISD_DIR): $(MTA_DEST_DIR)
	@echo "*** Creating amavisd"
	mkdir -p $@/sbin
	cp -f $(AMAVISD_SOURCE)/amavisd $@/sbin
	mkdir -p $@/.spamassassin/init
	cp -f $(RPM_CONF_DIR)/SpamAssassin/bayes* $@/.spamassassin/init

$(MTA_DEST_DIR)/$(SASL_DIR): $(MTA_DEST_DIR)
	@echo "*** Creating cyrus-sasl"
	(cd $(MTA_DEST_DIR); tar xzf $(SASL_SOURCE).tgz;)
	mkdir -p $(MTA_DEST_DIR)/$(SASL_DIR)-$(SASL_VERSION)/etc
	cp -f $(SERVICE_DIR)/conf/saslauthd.conf.in $(MTA_DEST_DIR)/$(SASL_DIR)-$(SASL_VERSION)/etc/
	cp -f $(SERVICE_DIR)/conf/postfix_sasl_smtpd.conf $(MTA_DEST_DIR)/$(SASL_DIR)-$(SASL_VERSION)/lib/sasl2/smtpd.conf

$(MTA_DEST_DIR)/$(BDB_DIR): $(MTA_DEST_DIR)
	@echo "*** Creating sleepycat"
	(cd $(MTA_DEST_DIR); tar xzf $(BDB_SOURCE).tgz; chmod u+w $(BDB_DIR)/bin/*)

# __STORE

store: $(RPM_DIR) store_stage
	cat $(RPM_CONF_DIR)/Spec/zimbra.spec | \
		sed -e 's/@@VERSION@@/$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)/' \
		| sed -e 's/@@RELEASE@@/$(RELEASE)/' > $(BUILD_ROOT)/zimbra.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/jakarta-tomcat-5.5.7" >> \
		$(BUILD_ROOT)/zimbra.spec
	echo "%attr(755, zimbra, zimbra) /opt/zimbra/libexec" >> \
		$(BUILD_ROOT)/zimbra.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/mysql-standard-4.1.10a-pc-linux-gnu-i686" >> \
		$(BUILD_ROOT)/zimbra.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/verity/conf" >> \
		$(BUILD_ROOT)/zimbra.spec
	echo "%attr(755, zimbra, zimbra) /opt/zimbra/verity/ExportSDK/bin" >> \
		$(BUILD_ROOT)/zimbra.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/verity/ExportSDK/ini" >> \
		$(BUILD_ROOT)/zimbra.spec
	echo "%attr(755, zimbra, zimbra) /opt/zimbra/verity/FilterSDK/bin" >> \
		$(BUILD_ROOT)/zimbra.spec
	(cd $(STORE_DEST_ROOT); \
		rpmbuild  --target i386 --quiet --define '_rpmdir $(BUILD_ROOT)' \
		--buildroot=$(STORE_DEST_ROOT) -bb $(BUILD_ROOT)/zimbra.spec )

store_stage: $(STORE_COMPONENTS)

$(STORE_DEST_DIR):
	mkdir -p $@

$(STORE_DEST_DIR)/$(MYSQL_DIR):
	@echo "*** Creating mysql"
	(cd $(STORE_DEST_DIR); tar xzf $(MYSQL_SOURCE).tar.gz;)

$(STORE_DEST_DIR)/$(TOMCAT_DIR): $(STORE_DEST_DIR)
	@echo "*** Creating tomcat"
	(cd $(STORE_DEST_DIR); tar xzf $(TOMCAT_SOURCE).tar.gz;)
	cp $(THIRD_PARTY)/jakarta-tomcat/jmxri.jar $(STORE_DEST_DIR)/$(TOMCAT_DIR)/bin/jmx.jar
	cp $(SERVICE_DIR)/conf/tomcat-5.5/server.xml.production \
		$(STORE_DEST_DIR)/$(TOMCAT_DIR)/conf/server.xml
	cp $(SERVICE_DIR)/conf/zimbra.xml \
		$(STORE_DEST_DIR)/$(TOMCAT_DIR)/conf/Catalina/localhost/zimbra.xml
	mkdir -p $(STORE_DEST_DIR)/$(TOMCAT_DIR)/conf/AdminService/localhost
	cp $(SERVICE_DIR)/conf/zimbraAdmin.xml \
		$(STORE_DEST_DIR)/$(TOMCAT_DIR)/conf/AdminService/localhost/zimbraAdmin.xml
	cp $(SERVICE_DIR)/conf/tomcat-5.5/tomcat-users.xml $(STORE_DEST_DIR)/$(TOMCAT_DIR)/conf
	cp -f $(SERVICE_DIR)/conf/log4j.properties.production  \
		$(STORE_DEST_DIR)/$(TOMCAT_DIR)/conf/log4j.properties
	mkdir -p $(STORE_DEST_DIR)/$(TOMCAT_DIR)/temp
	touch $(STORE_DEST_DIR)/$(TOMCAT_DIR)/temp/.emptyfile

$(STORE_DEST_DIR)/verity:
	mkdir -p $@/conf
	cp -R $(VERITY_SOURCE)/ExportSDK $@
	cp -R $(VERITY_SOURCE)/FilterSDK $@
	cp $(VERITY_SOURCE)/../conf/mimetypes.properties $@/conf

$(WEBAPP_DIR): $(STORE_DEST_DIR)/$(TOMCAT_DIR)
	mkdir -p $@

$(STORE_DEST_DIR)/libexec:
	mkdir -p $@
	cp -R $(SERVICE_DIR)/libexec/[a-z]* $@
	cp -R $(SERVICE_DIR)/src/libexec/[a-z]* $@

# __WAR 

$(WEBAPP_DIR)/service.war: $(WEBAPP_DIR) $(SERVICE_DIR)/$(WEBAPP_BUILD_DIR)/service.war
	cp $(SERVICE_DIR)/build/dist/tomcat/webapps/service.war $@

$(SERVICE_DIR)/$(WEBAPP_BUILD_DIR)/service.war:
	(cd $(CONVERT_DIR); $(ANT) \
		-Dzimbra.buildinfo.version=$(MAJOR).$(MINOR)_$(BUILD_PLATFORM) \
		-Dzimbra.buildinfo.release=$(RELEASE) -Dzimbra.buildinfo.date=$(DATE) \
		-Dzimbra.buildinfo.host=$(HOST) dev-dist ; )
	(cd $(BACKUP_DIR); $(ANT) \
		-Dzimbra.buildinfo.version=$(MAJOR).$(MINOR)_$(BUILD_PLATFORM) \
		-Dzimbra.buildinfo.release=$(RELEASE) -Dzimbra.buildinfo.date=$(DATE) \
		-Dzimbra.buildinfo.host=$(HOST) dev-dist ; )

$(WEBAPP_DIR)/zimbraAdmin.war: $(WEBAPP_DIR) $(CONSOLE_DIR)/$(WEBAPP_BUILD_DIR)/zimbraAdmin.war
	cp $(CONSOLE_DIR)/build/dist/tomcat/webapps/zimbraAdmin.war $@

$(CONSOLE_DIR)/$(WEBAPP_BUILD_DIR)/zimbraAdmin.war:
	(cd $(CONSOLE_DIR); $(ANT) clean admin-war;)

$(WEBAPP_DIR)/zimbra.war: $(WEBAPP_DIR) $(CONSOLE_DIR)/$(WEBAPP_BUILD_DIR)/zimbra.war
	cp $(CONSOLE_DIR)/build/dist/tomcat/webapps/zimbra.war $@

$(CONSOLE_DIR)/$(WEBAPP_BUILD_DIR)/zimbra.war: 
	(cd $(CONSOLE_DIR); $(ANT) clean prod-war;)

# __JAR

$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/mail.jar: $(STORE_DEST_DIR)/$(TOMCAT_DIR) $(WEBAPP_DIR)/service.war
	mkdir -p $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib
	cp $(SERVICE_DIR)/build/dist/lib/mail.jar $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib

$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/endorsed/zimbra-charset.jar: $(STORE_DEST_DIR)/$(TOMCAT_DIR) $(WEBAPP_DIR)/service.war
	cp $(SERVICE_DIR)/build/dist/lib/zimbra-charset.jar $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/endorsed

$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/activation.jar: $(STORE_DEST_DIR)/$(TOMCAT_DIR) $(WEBAPP_DIR)/service.war
	mkdir -p $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib
	cp $(SERVICE_DIR)/build/dist/lib/activation.jar $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib

$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/KeyView.jar: $(STORE_DEST_DIR)/$(TOMCAT_DIR) $(WEBAPP_DIR)/service.war
	mkdir -p $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib
	cp $(SERVICE_DIR)/build/dist/lib/KeyView.jar $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib

$(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib/zimbra-native.jar: $(STORE_DEST_DIR)/$(TOMCAT_DIR) $(WEBAPP_DIR)/service.war
	mkdir -p $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib
	cp $(SERVICE_DIR)/build/dist/lib/zimbra-native.jar $(STORE_DEST_DIR)/$(TOMCAT_DIR)/common/lib

# __SNMP

snmp: $(RPM_DIR) snmp_stage
	cat $(RPM_CONF_DIR)/Spec/zimbrasnmp.spec | \
		sed -e 's/@@VERSION@@/$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)/' \
		| sed -e 's/@@RELEASE@@/$(RELEASE)/' > $(BUILD_ROOT)/zimbrasnmp.spec
	echo "%attr(-, zimbra, zimbra) /opt/zimbra/snmp-5.1.2" >> \
		$(BUILD_ROOT)/zimbrasnmp.spec
	(cd $(SNMP_DEST_ROOT); \
		rpmbuild  --target i386 --quiet --define '_rpmdir $(BUILD_ROOT)' \
		--buildroot=$(SNMP_DEST_ROOT) -bb $(BUILD_ROOT)/zimbrasnmp.spec )

snmp_stage: $(SNMP_COMPONENTS)

$(SNMP_DEST_DIR):
	mkdir -p $@

$(SNMP_DEST_DIR)/$(SNMP_DIR): $(SNMP_DEST_DIR)
	@echo "*** Creating SNMP"
	(cd $(SNMP_DEST_DIR); tar xzf $(SNMP_SOURCE).tar.gz;)
	cp $(RPM_CONF_DIR)/Conf/snmpd.conf.in $(SNMP_DEST_DIR)/$(SNMP_DIR)/share/snmp/snmpd.conf.in
	mkdir -p $(SNMP_DEST_DIR)/$(SNMP_DIR)/conf
	cp $(RPM_CONF_DIR)/Conf/snmp.conf $(SNMP_DEST_DIR)/$(SNMP_DIR)/conf/snmp.conf
	cp $(RPM_CONF_DIR)/Conf/snmp.conf $(SNMP_DEST_DIR)/$(SNMP_DIR)/share/snmp/snmp.conf
	cp $(RPM_CONF_DIR)/Conf/mibs/*mib $(SNMP_DEST_DIR)/$(SNMP_DIR)/share/snmp/mibs

# __QA

qatest: $(RPM_DIR) qa_stage
	cat $(RPM_CONF_DIR)/Spec/zimbraqa.spec | \
		sed -e 's/@@VERSION@@/$(MAJOR).$(MINOR)_$(BUILD_PLATFORM)/' \
		| sed -e 's/@@RELEASE@@/$(RELEASE)/' > $(BUILD_ROOT)/zimbraqa.spec
	(cd $(QA_DEST_ROOT); find opt -type f -o -type l | \
		sed -e 's|^|%attr(-, zimbra, zimbra) /|' >> \
		$(BUILD_ROOT)/zimbraqa.spec; \
		rpmbuild  --target i386 --quiet --define '_rpmdir $(BUILD_ROOT)' \
		--buildroot=$(QA_DEST_ROOT) -bb $(BUILD_ROOT)/zimbraqa.spec )

qa_stage: $(QA_COMPONENTS)

$(QA_DEST_DIR)/TestMailRaw:
	rm -rf $@
	cp -Rf $(SERVICE_DIR)/data/TestMailRaw $@

$(QA_DEST_DIR)/scripts:
	mkdir -p $@
	cp -f $(QA_DIR)/src/bin/runtests.sh $@
	cp -f $(QA_DIR)/src/bin/createUsers.sh $@
	cp -f $(QA_DIR)/src/bin/injectTestMail.sh $@

$(QA_DEST_DIR):
	mkdir -p $@

# DIRS

$(RPM_DIR):
	mkdir -p $(RPM_DIR)

perllibsbuild: 
	make -C $(PERL_LIB_SOURCE)

# CLEAN

clean:
	rm -rf $(CLEAN_TARGETS)

allclean: clean
	(cd $(SERVICE_DIR); $(ANT) clean)
	(cd $(CONVERT_DIR); $(ANT) clean)
	(cd $(BACKUP_DIR); $(ANT) clean)
	(cd $(CONSOLE_DIR); $(ANT) clean)
	(cd $(QA_DIR); $(ANT) clean)

# __DEV TARGETS

dev-allclean:
	-su - zimbra -c zmcontrol shutdown
	rm -rf $(DEV_INSTALL_ROOT)/*

dev-clean: dev-stop
	rm -rf $(DEV_CLEAN_TARGETS)

$(DEV_INSTALL_ROOT):
	mkdir -p $@

dev-mta-install: $(DEV_INSTALL_ROOT)/$(POSTFIX_DIR) 
	rm -f $(DEV_INSTALL_ROOT)/postfix
	ln -s $(DEV_INSTALL_ROOT)/$(POSTFIX_DIR) $(DEV_INSTALL_ROOT)/postfix
	echo "*** MTA Install complete"

$(DEV_INSTALL_ROOT)/$(POSTFIX_DIR): $(DEV_INSTALL_ROOT)
	@echo "*** Installing postfix"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(POSTFIX_SOURCE).tgz;)
	cp -f $(SERVICE_DIR)/conf/postfix/main.cf $(DEV_INSTALL_ROOT)/$(POSTFIX_DIR)/conf/main.cf
	cp -f $(SERVICE_DIR)/conf/postfix/master.cf $(DEV_INSTALL_ROOT)/$(POSTFIX_DIR)/conf/master.cf
	sh -x $(ZIMBRA_BIN_DIR)/zmfixperms.sh

$(DEV_INSTALL_ROOT)/$(CLAMAV_DIR): $(DEV_INSTALL_ROOT)
	@echo "*** Installing clamav"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(CLAMAV_SOURCE).tgz;)
	mkdir -p $(DEV_INSTALL_ROOT)/$(CLAMAV_DIR)-$(CLAMAV_VERSION)/db
	cp -f $(RPM_CONF_DIR)/ClamAv/main.cvd $(DEV_INSTALL_ROOT)/$(CLAMAV_DIR)-$(CLAMAV_VERSION)/db/main.cvd.init
	cp -f $(RPM_CONF_DIR)/ClamAv/daily.cvd $(DEV_INSTALL_ROOT)/$(CLAMAV_DIR)-$(CLAMAV_VERSION)/db/daily.cvd.init

dev-install: $(DEV_INSTALL_ROOT)/$(MYSQL_DIR) $(DEV_INSTALL_ROOT)/$(LDAP_DIR) $(DEV_INSTALL_ROOT)/$(TOMCAT_DIR) $(DEV_INSTALL_ROOT)/$(CLAMAV_DIR) $(DEV_INSTALL_ROOT)/$(AMAVISD_DIR) $(DEV_INSTALL_ROOT)/zimbramon $(DEV_INSTALL_ROOT)/db $(DEV_INSTALL_ROOT)/lib $(DEV_INSTALL_ROOT)/bin $(DEV_INSTALL_ROOT)/conf $(DEV_INSTALL_ROOT)/$(JAVA_FILE)$(JAVA_VERSION) $(DEV_INSTALL_ROOT)/$(BDB_DIR)
	rm -f $(DEV_INSTALL_ROOT)/clamav $(DEV_INSTALL_ROOT)/tomcat $(DEV_INSTALL_ROOT)/mysql $(DEV_INSTALL_ROOT)/openlap
	ln -s $(DEV_INSTALL_ROOT)/$(CLAMAV_DIR)-$(CLAMAV_VERSION) $(DEV_INSTALL_ROOT)/clamav
	ln -s $(DEV_INSTALL_ROOT)/$(TOMCAT_DIR) $(DEV_INSTALL_ROOT)/tomcat
	ln -s $(DEV_INSTALL_ROOT)/$(MYSQL_DIR) $(DEV_INSTALL_ROOT)/mysql
	ln -s $(DEV_INSTALL_ROOT)/$(LDAP_DIR) $(DEV_INSTALL_ROOT)/openldap
	ln -s $(DEV_INSTALL_ROOT)/$(JAVA_FILE)$(JAVA_VERSION) $(DEV_INSTALL_ROOT)/java
	ln -s $(DEV_INSTALL_ROOT)/$(BDB_DIR) $(DEV_INSTALL_ROOT)/sleepycat
	@echo "*** Installation complete"

$(DEV_INSTALL_ROOT)/$(MYSQL_DIR): $(DEV_INSTALL_ROOT)
	@echo "*** Installing mysql"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(MYSQL_SOURCE).tar.gz;)

$(DEV_INSTALL_ROOT)/$(LDAP_DIR): $(DEV_INSTALL_ROOT)
	@echo "*** Installing openldap"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(LDAP_SOURCE).tgz;)
	cp -f $(SERVICE_DIR)/conf/ldap/DB_CONFIG $@/var/openldap-data
	cp -f $(SERVICE_DIR)/conf/ldap/slapd.conf $@/etc/openldap/slapd.conf
	cp -f $(SERVICE_DIR)/conf/ldap/amavisd.schema $@/etc/openldap/schema
	cp -f $(SERVICE_DIR)/conf/ldap/zimbra.schema $@/etc/openldap/schema
	cp -f $(SERVICE_DIR)/conf/ldap/zimbra.ldif $@/etc/openldap/zimbra.ldif
	cp -f $(SERVICE_DIR)/conf/ldap/widgets.ldif $@/etc/openldap/widgets.ldif

$(DEV_INSTALL_ROOT)/$(TOMCAT_DIR): $(DEV_INSTALL_ROOT) $(SERVICE_DIR)/build/dist/tomcat/webapps/service.war  $(CONSOLE_DIR)/build/dist/tomcat/webapps/zimbra.war
	@echo "*** Installing tomcat"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(TOMCAT_SOURCE).tar.gz;)
	cp -f $(THIRD_PARTY)/jakarta-tomcat/jmxri.jar $@/bin/jmx.jar
	cp -f $(SERVICE_DIR)/conf/tomcat-5.5/server.xml.production $@/conf/server.xml
	cp -f $(SERVICE_DIR)/conf/zimbra.xml $@/conf/Catalina/localhost/zimbra.xml
	mkdir -p $@/conf/AdminService/localhost
	cp -f $(SERVICE_DIR)/conf/zimbraAdmin.xml $@/conf/AdminService/localhost/zimbraAdmin.xml
	cp -f $(SERVICE_DIR)/conf/tomcat-5.5/tomcat-users.xml $@/conf
	cp -f $(SERVICE_DIR)/conf/log4j.properties.production  $@/conf/log4j.properties
	mkdir -p $@/temp
	touch $@/temp/.emptyfile

$(DEV_INSTALL_ROOT)/$(AMAVISD_DIR): $(DEV_INSTALL_ROOT)
	@echo "*** Installing amavisd"
	mkdir -p $@/sbin
	cp -f $(AMAVISD_SOURCE)/amavisd $@/sbin
	mkdir -p $@/.spamassassin/init
	cp -f $(RPM_CONF_DIR)/SpamAssassin/bayes* $@/.spamassassin/init

devperllibs: 
	mkdir -p $(DEV_INSTALL_ROOT)/zimbramon/lib
	(cd $(DEV_INSTALL_ROOT)/zimbramon/lib; \
	tar xzf $(PERL_LIB_SOURCE)/builds/perllib.tgz)
	cp -fR $(BUILD_ROOT)/lib/Zimbra $(DEV_INSTALL_ROOT)/zimbramon/lib

$(DEV_INSTALL_ROOT)/zimbramon: $(DEV_INSTALL_ROOT) devperllibs
	@echo "*** Installing zimbramon"
	mkdir -p $@
	cp -f -R $(ZIMBRA_BIN_DIR)/zmmon $@
	chmod 755 $@/zmmon
	cp -f -R $(ZIMBRA_BIN_DIR)/zmcontrol $@
	chmod 755 $@/zmcontrol
	cp -f -R $(RPM_CONF_DIR)/Ctl/zimbra.cf.in $@
	cp -f -R $(RPM_CONF_DIR)/Ctl/zimbracore.cf $@
	cp -f -R $(RPM_CONF_DIR)/Ctl/zimbramail.cf $@
	cp -f -R $(RPM_CONF_DIR)/Ctl/zimbramta.cf $@
	cp -f -R $(RPM_CONF_DIR)/Ctl/zimbraldap.cf $@
	cp -f -R $(RPM_CONF_DIR)/Ctl/zimbrasnmp.cf $@
	mkdir -p $@/lib/Zimbra/Mon
	@cp -f $(wildcard $(BUILD_ROOT)/lib/Zimbra/Mon/*.pm) $@/lib/Zimbra/Mon
	mkdir -p $@/lib/Zimbra/Mon/SOAP
	@cp -f $(wildcard $(SERVICE_DIR)/src/perl/soap/*.pm) $@/lib/Zimbra/Mon/SOAP
	(cd $(DEV_INSTALL_ROOT)/zimbramon; tar xzf $(MRTG_SOURCE).tgz)
	mkdir -p $(DEV_INSTALL_ROOT)/zimbramon/mrtg/work
	mkdir -p $(DEV_INSTALL_ROOT)/zimbramon/mrtg/conf
	cp -f $(RPM_CONF_DIR)/Conf/mrtg.cfg $(DEV_INSTALL_ROOT)/zimbramon/mrtg/conf
	cp -f $(RPM_CONF_DIR)/Env/crontab $(DEV_INSTALL_ROOT)/zimbramon/crontab
	(cd $(DEV_INSTALL_ROOT)/zimbramon; tar xzf $(RRD_SOURCE).tar.gz)

$(DEV_INSTALL_ROOT)/db:
	@echo "*** Installing db"
	mkdir -p $@
	cp -f -R $(SERVICE_DIR)/src/db/db.sql $@
	cp -f -R $(SERVICE_DIR)/src/db/create_database.sql $@
	cp -f -R $(SERVICE_DIR)/build/versions-init.sql $@

$(DEV_INSTALL_ROOT)/$(BDB_DIR): $(DEV_INSTALL_ROOT)
	@echo "*** Installing sleepycat"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(BDB_SOURCE).tgz; chmod u+w $(BDB_DIR)/bin/*)

$(DEV_INSTALL_ROOT)/lib: $(DEV_INSTALL_ROOT)/$(LDAP_DIR) $(DEV_INSTALL_ROOT)/$(BDB_DIR)
	@echo "*** Installing lib"
	mkdir -p $@
	cp -f -pr $(SERVICE_DIR)/build/dist/lib/* $@
	cp -f -pr $(DEV_INSTALL_ROOT)/$(LDAP_DIR)/lib/* $@
	cp -f -pr $(DEV_INSTALL_ROOT)/$(BDB_DIR)/lib/* $@
	cp -f -pr $(SERVICE_DIR)/build/dist/lib/* $@
	cp -f $(THIRD_PARTY)/curl/curl.tgz $@
	cp -f $(THIRD_PARTY)/idn/idn.tgz $@
	(cd $@; tar xzf $(THIRD_PARTY)/mysql/mysql-standard-4.1.10a-clientlibs.tgz)

$(DEV_INSTALL_ROOT)/bin:
	@echo "*** Installing bin"
	mkdir -p $@
	cp -f -R $(SERVICE_DIR)/build/dist/bin/[a-z]* $@
	rm -f $(DEV_INSTALL_ROOT)/bin/zmtransserver.bat
	rm -f $(DEV_INSTALL_ROOT)/bin/ldap
	mv $@/ldap.production $@/ldap
	cp -f $(ZIMBRA_BIN_DIR)/swatch $@
	cp -f $(ZIMBRA_BIN_DIR)/zmswatchctl $@
	cp -f $(ZIMBRA_BIN_DIR)/zmloadstats $@
	cp -f $(ZIMBRA_BIN_DIR)/zmaggregatestats $@
	cp -f $(ZIMBRA_BIN_DIR)/zmaggregatestatsdaily $@
	cp -f $(ZIMBRA_BIN_DIR)/zmgetstats $@
	cp -f $(ZIMBRA_BIN_DIR)/zmlogrotate $@
	cp -f $(ZIMBRA_BIN_DIR)/zmsnmpinit $@
	cp -f $(ZIMBRA_BIN_DIR)/zmgengraphs $@
	cp -f $(ZIMBRA_BIN_DIR)/zmgensystemwidegraphs $@
	cp -f $(ZIMBRA_BIN_DIR)/zmfetchstats $@
	cp -f $(ZIMBRA_BIN_DIR)/zmfetchallstats $@
	cp -f $(ZIMBRA_BIN_DIR)/zmcreatecert $@
	cp -f $(ZIMBRA_BIN_DIR)/zmroll_catalina.sh $@
	cp -f $(ZIMBRA_BIN_DIR)/zmtlsctl $@
	cp -f $(ZIMBRA_BIN_DIR)/zmfixperms.sh $@
	chmod u+x $@/*

$(DEV_INSTALL_ROOT)/conf:
	@echo "*** Installing conf"
	mkdir -p $@
	cp -f $(RPM_CONF_DIR)/Conf/swatchrc $@/swatchrc.in
	cp -f -R $(SERVICE_DIR)/conf/localconfig.xml $@/localconfig.xml
	grep -vi stats $(SERVICE_DIR)/conf/log4j.properties.production > $@/log4j.properties
	cp -f $(RPM_CONF_DIR)/Conf/zmssl.cnf.in $@
	cp -f $(SERVICE_DIR)/conf/amavisd.conf.in $@
	cp -f $(SERVICE_DIR)/conf/clamd.conf $@
	cp -f $(SERVICE_DIR)/conf/freshclam.conf $@
	cp -f $(SERVICE_DIR)/conf/salocal.cf $@
	mkdir -p $@/spamassassin
	cp -f $(SERVICE_DIR)/conf/spamassassin/* $@/spamassassin

$(DEV_INSTALL_ROOT)/$(JAVA_FILE)$(JAVA_VERSION):
	@echo "*** Installing $(JAVA_FILE)$(JAVA_VERSION)"
	(cd $(DEV_INSTALL_ROOT); tar xzf $(JAVA_SOURCE).tgz;)

dev-stop:
	-$(DEV_INSTALL_ROOT)/bin/mysql.server stop
	-$(DEV_INSTALL_ROOT)/bin/ldap stop
	-$(DEV_INSTALL_ROOT)/bin/tomcat stop
	-$(DEV_INSTALL_ROOT)/bin/postfix stop

# MISC

showtag:
	echo $(RELEASE)
	echo $(TAG)
