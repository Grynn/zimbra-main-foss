#!/usr/bin/perl
# 
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1
# 
# The contents of this file are subject to the Mozilla Public License
# Version 1.1 ("License"); you may not use this file except in
# compliance with the License. You may obtain a copy of the License at
# http://www.zimbra.com/license
# 
# Software distributed under the License is distributed on an "AS IS"
# basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
# the License for the specific language governing rights and limitations
# under the License.
# 
# The Original Code is: Zimbra Collaboration Suite Server.
# 
# The Initial Developer of the Original Code is Zimbra, Inc.
# Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
# All Rights Reserved.
# 
# Contributor(s):
# 
# ***** END LICENSE BLOCK *****
# 

use strict;

use lib "/opt/zimbra/libexec";
use lib "/opt/zimbra/zimbramon/lib";
use lib "/opt/zimbra/zimbramon/lib/i386-linux-thread-multi";
use lib "/opt/zimbra/zimbramon/lib/i586-linux-thread-multi";
use lib "/opt/zimbra/zimbramon/lib/darwin-thread-multi-2level";

our $platform = `/opt/zimbra/libexec/get_plat_tag.sh`;
chomp $platform;

my $logfile = "/tmp/zmsetup.log.$$";
open LOGFILE, ">$logfile" or die "Can't open $logfile: $!\n";

my $ol = select (LOGFILE);
$| = 1;
select ($ol);

print "Operations logged to $logfile\n";

our $ZMPROV = "/opt/zimbra/bin/zmprov -l";

if ($platform =~ /MACOSX/) {
	progress ("Checking java version...");
	my $rc = 0xffff & system("su - zimbra -c \"java -version 2>&1 | grep 'java version' | grep -q 1.5\"");
	if ($rc) {
		progress ("\n\nERROR\n\n");
		progress ("Java version 1.5 required - please update your java version\n");
		progress ("and set the default version to be 1.5 before proceeding\n\n");
		ask ("Press any key to exit","");
		exit (1);
	} else {
		progress ("1.5 found\n");
	}
}

if ($platform =~ /SuSE/) { `chmod 640 /etc/sudoers`;}

use preinstall;
use postinstall;

use zmupgrade;

use Getopt::Std;

use Net::DNS::Resolver;

our %options = ();

our %config = ();

my @packageList = (
	"zimbra-core",
	"zimbra-ldap",
	"zimbra-store",
	"zimbra-mta",
	"zimbra-snmp",
	"zimbra-logger",
	"zimbra-apache",
	"zimbra-spell",
	);

my %installedPackages = ();
my %enabledPackages = ();

my $zimbraHome = "/opt/zimbra";

my %installStatus = ();
my %configStatus = ();

my $prevVersion = "";
our $curVersion = "";

our $newinstall = 1;

my $ldapConfigured = 0;
my $ldapRunning = 0;
my $sqlConfigured = 0;
my $sqlRunning = 0;
my $loggerSqlConfigured = 0;
my $loggerSqlRunning = 0;
my $installedServiceStr = "";
my $enabledServiceStr = "";

my $ldapPassChanged = 0;

my @interfaces = ();

($>) and usage();

getopts("c:hd", \%options) or usage();

sub usage {
	($>) and print STDERR "Warning: $0 must be run as root!\n\n";
	print STDERR "Usage: $0 [-h] [-c <config file>]\n";
	print STDERR "\t-h: display this help message\n";
	print STDERR "\t-c: configure with values in <config file>\n\n";
	exit 1;
}

sub progress {
	my $msg = shift;
	print $msg;
	detail ($msg);
}

sub status {
}

sub detail {
	my $msg = shift;
	`echo "$msg" >> $logfile`;
}

sub saveConfig {
	my $fname = "/opt/zimbra/config.$$";
	if (!(defined ($options{c})) && $newinstall ) {
		$fname = askNonBlank ("Save config in file:", $fname);
	}

	if (open CONF, ">$fname") {
		progress ("Saving config in $fname...");
		foreach (sort keys %config) {
			# Don't write passwords
			if (/PASS/) {next;} 
			print CONF "$_=$config{$_}\n";
		}
		print CONF "INSTALL_PACKAGES=\"";
		foreach (sort keys %installedPackages) {
			print CONF "$_ ";
		}
		print CONF "\"\n";
		close CONF;
		progress ("Done\n");
	} else {
		progress( "Can't open $fname: $!\n");
	}
}

sub loadConfig {
	my $filename = shift;
	open (CONF, $filename) or die "Can't open $filename: $!";
	my @lines = <CONF>;
	close CONF;
	foreach (@lines) {
		chomp;
		my ($k, $v) = split ('=', $_, 2);
		$config{$k} = $v;
	}

	$config{ALLOWSELFSIGNED} = "true";
}

sub checkPortConflicts {

	if ($platform =~ /MACOSX/) {
		# Shutdown postfix in launchd
		if (-f "/System/Library/LaunchDaemons/org.postfix.master.plist") {
			progress ( "Disabling postfix in launchd\n");
			system ("/bin/launchctl unload -w /System/Library/LaunchDaemons/org.postfix.master.plist");
		}
	}
	progress ( "Checking for port conflicts\n" );
	my %needed = (
		25 => 'zimbra-mta',
		80 => 'zimbra-store',
		110 => 'zimbra-store',
		143 => 'zimbra-store',
		389 => 'zimbra-ldap',
		443 => 'zimbra-store',
		636 => 'zimbra-ldap',
		993 => 'zimbra-store',
		995 => 'zimbra-store',
		7025 => 'zimbra-store',
		7306 => 'zimbra-store',
		7307 => 'zimbra-store',
		7780 => 'zimbra-spell',
		10024 => 'zimbra-mta',
		10025 => 'zimbra-mta',
	);

	open PORTS, "netstat -an | egrep '^tcp' | grep LISTEN | awk '{print \$4}' | sed -e 's/.*://' |";
	my @ports = <PORTS>;
	close PORTS;
	chomp @ports;

	my $any = 0;
	foreach (@ports) {
		if (defined ($needed{$_}) && isEnabled($needed{$_})) {
			$any = 1;
			progress ( "Port conflict detected: $_ ($needed{$_})\n" );
		}
	}

	if (!$options{c}) {
		if ($any) { ask("Port conflicts detected! - Any key to continue", ""); }
	}

}

sub getInstalledPackages {

	foreach my $p (@packageList) {
		if (isInstalled($p)) {
			$installedPackages{$p} = $p;
			$enabledPackages{$p} = "Enabled";
		}
	}
	
}

sub isInstalled {
	my $pkg = shift;

	my $pkgQuery;

	my $good = 1;
	if ($platform eq "DEBIAN3.1") {
		$pkgQuery = "dpkg -s $pkg | egrep '^Status: ' | grep 'not-installed'";
	} elsif ($platform =~ /MACOSX/) {
		my @l = sort glob ("/Library/Receipts/${pkg}*");
		if ( $#l < 0 ) { return 0; }
		$pkgQuery = "test -d $l[$#l]";
		$good = 0;
	} elsif ($platform =~ /RPL/) {
		$pkgQuery = "conary q $pkg";
		$good = 0;
	} else {
		$pkgQuery = "rpm -q $pkg";
		$good = 0;
	}

	my $rc = 0xffff & system ("$pkgQuery > /dev/null 2>&1");
	$rc >>= 8;
	return ($rc == $good);

}

sub genRandomPass {
	open RP, "/opt/zimbra/bin/zmjava com.zimbra.cs.util.RandomPassword 8 10|" or
		die "Can't generate random password: $!\n";
	my $rp = <RP>;
	close RP;
	chomp $rp;
	return $rp;
}

sub getSystemStatus {

	if (isEnabled("zimbra-ldap")) {
		if (-f "$zimbraHome/openldap-data/mail.bdb") {
			$ldapConfigured = 1;
			$ldapRunning = 0xffff & system("/opt/zimbra/bin/ldap status > /dev/null 2>&1");
			if ($ldapRunning) {
				$ldapRunning = 0;
			} else {
				$ldapRunning = 1;
			}
			# Mac on x86 choked on this line?
			#$ldapRunning = ($ldapRunning)?0:1;
		} else {
			$config{DOCREATEDOMAIN} = "yes";
		}
	}

	if (isEnabled("zimbra-store")) {
		if (-d "$zimbraHome/db/data") {
			$sqlConfigured = 1;
			$sqlRunning = 0xffff & system("/opt/zimbra/bin/mysqladmin status > /dev/null 2>&1");
			$sqlRunning = ($sqlRunning)?0:1;
		}
		if ($newinstall) {
			$config{DOCREATEADMIN} = "yes";
			$config{DOTRAINSA} = "yes";
		}
	}

	if (isEnabled("zimbra-logger")) {
		if (-d "$zimbraHome/logger/db/data") {
			$loggerSqlConfigured = 1;
			$loggerSqlRunning = 0xffff & 
				system("/opt/zimbra/bin/logmysqladmin status > /dev/null 2>&1");
			$loggerSqlRunning = ($loggerSqlRunning)?0:1;
		}
	}

	if (isEnabled("zimbra-mta")) {
		if ($config{SMTPHOST} eq "") {
			$config{SMTPHOST} = $config{HOSTNAME};
		}
	}
}

sub getLdapConfigValue {
	my $attrib = shift;

	# Gotta love the triple escape: \\\  
	my $rc = 0xffff & system("su - zimbra -c \"$ZMPROV gcf $attrib | sed -e \\\"s/${attrib}: //\\\" > /tmp/ld.out\"");
	my $val=`cat /tmp/ld.out`;
	unlink "/tmp/ld.out";
	chomp $val;

	return $val;
}
sub getLdapServerValue {
	my $attrib = shift;
	my $hn = shift;
	if ($hn eq "") {
		$hn = $config{HOSTNAME};
	}

	# Gotta love the triple escape: \\\  
	my $rc = 0xffff & system("su - zimbra -c \"$ZMPROV gs $hn | grep $attrib | sed -e \\\"s/${attrib}: //\\\" > /tmp/ld.out\"");
	my $val=`cat /tmp/ld.out`;
	unlink "/tmp/ld.out";
	chomp $val;

	return $val;
}

sub setLdapDefaults {
	progress ( "Setting defaults from ldap..." );

	my $sslport=getLdapServerValue("zimbraMailSSLPort");

	my $mailport=getLdapServerValue("zimbraMailPort");

	my $mailmode=getLdapServerValue("zimbraMailMode");

	$config{HTTPPORT} = $mailport;
	$config{HTTPSPORT} = $sslport;
	$config{MODE} = $mailmode;
	if ($config{HTTPPORT} eq 0) { $config{HTTPPORT} = 80; }
	if ($config{HTTPSPORT} eq 0) { $config{HTTPSPORT} = 443; }
	if ($config{MODE} eq "") { $config{MODE} = "mixed"; }

	my $rc = 0xffff & system("su - zimbra -c \"$ZMPROV gs $config{HOSTNAME} | grep 'zimbraServiceEnabled: imapproxy' | sed -e 's/zimbraServiceEnabled: //' > /tmp/ld.out\"");
	$config{USEIMAPPROXY}=`cat /tmp/ld.out`;

	chomp $config{USEIMAPPROXY};
	if ($config{USEIMAPPROXY} eq "imapproxy") {
		$config{USEIMAPPROXY} = "yes";
	} else {
		$config{USEIMAPPROXY} = "no";
	}

	$config{IMAPPORT} 			= getLdapServerValue("zimbraImapBindPort");
	$config{IMAPSSLPORT} 		= getLdapServerValue("zimbraImapSSLBindPort");
	$config{POPPORT} 			= getLdapServerValue("zimbraPop3BindPort");
	$config{POPSSLPORT} 		= getLdapServerValue("zimbraPop3SSLBindPort");
	$config{HTTPPORT} 			= getLdapServerValue("zimbraMailPort");
	$config{HTTPSPORT} 			= getLdapServerValue("zimbraMailSSLPort");
	$config{IMAPPROXYPORT} 		= getLdapServerValue("zimbraImapProxyBindPort");
	$config{IMAPSSLPROXYPORT} 	= getLdapServerValue("zimbraImapSSLProxyBindPort");
	$config{POPPROXYPORT} 		= getLdapServerValue("zimbraPop3ProxyBindPort");
	$config{POPSSLPROXYPORT} 	= getLdapServerValue("zimbraPop3SSLProxyBindPort");

  $config{TRAINSASPAM} = getLdapConfigValue("zimbraSpamIsSpamAccount");
  $config{TRAINSAHAM} = getLdapConfigValue("zimbraSpamIsNotSpamAccount");
  $config{NOTEBOOKACCOUNT} = getLdapConfigValue("zimbraNotebookAccount");

	my $smtphost=getLdapServerValue("zimbraSmtpHostname");
	if ( $smtphost ne "") {
		$config{SMTPHOST} = $smtphost;
	}

	my $mtaauthhost=getLdapServerValue("zimbraMtaAuthHost");
	if ( $mtaauthhost ne "") {
		$config{MTAAUTHHOST} = $mtaauthhost;
	}

  if ($options{d}) {
    foreach my $key (sort keys %config) {
      print "\tDEBUG: $key=$config{$key}\n";
    }
  }

	progress ( "Done\n" );
}

sub setDefaults {
	progress ( "Setting defaults..." );

	# Get the interfaces.
	# Do this in perl, since it's the same on all platforms.
	open INTS, "/sbin/ifconfig | grep 'inet ' |";
	foreach (<INTS>) {
		chomp;
		s/.*inet //;
		s/\s.*//;
		s/[a-zA-Z:]//g;
		push @interfaces, $_;
	}
	close INTS;

	$config{EXPANDMENU} = "no";
	$config{REMOVE} = "no";
	$config{UPGRADE} = "yes";
	$config{LDAPPORT} = 389;
	$config{USESPELL} = "no";
	$config{SPELLURL} = "";

	$config{IMAPPORT} = 143;
	$config{IMAPSSLPORT} = 993;
	$config{POPPORT} = 110;
	$config{POPSSLPORT} = 995;
	$config{HTTPPORT} = 80;
	$config{HTTPSPORT} = 443;
	$config{USEIMAPPROXY} = "no";
	$config{IMAPPROXYPORT} = 143;
	$config{IMAPSSLPROXYPORT} = 993;
	$config{POPPROXYPORT} = 110;
	$config{POPSSLPROXYPORT} = 995;

	if ($platform =~ /MACOSX/) {
		setLocalConfig ("zimbra_java_home", "/System/Library/Frameworks/JavaVM.framework/Versions/1.5/Home");
		$config{HOSTNAME} = `hostname`;
	} else {
		$config{HOSTNAME} = `hostname --fqdn`;
	}
	chomp $config{HOSTNAME};

	$config{SMTPHOST} = "";
	$config{SNMPTRAPHOST} = $config{HOSTNAME};
	$config{DOCREATEDOMAIN} = "no";
	$config{CREATEDOMAIN} = $config{HOSTNAME};
	$config{DOCREATEADMIN} = "no";
	if (isEnabled("zimbra-store")) {
		$config{MTAAUTHHOST} = $config{HOSTNAME};
		$config{DOCREATEADMIN} = "yes";
		$config{DOTRAINSA} = "yes";
		$config{TRAINSASPAM} = lc(genRandomPass());
		$config{TRAINSASPAM} .= '@'.$config{CREATEDOMAIN};
		$config{TRAINSAHAM} = lc(genRandomPass());
		$config{TRAINSAHAM} .= '@'.$config{CREATEDOMAIN};
		$config{NOTEBOOKACCOUNT} = lc(genRandomPass());
		$config{NOTEBOOKACCOUNT} .= '@'.$config{CREATEDOMAIN};
		$config{NOTEBOOKPASS} = genRandomPass();
	}
	if (isEnabled("zimbra-ldap")) {
		$config{DOCREATEDOMAIN} = "yes";
		$config{LDAPPASS} = genRandomPass();
	}
	$config{CREATEADMIN} = "admin\@$config{CREATEDOMAIN}";

	$config{SMTPSOURCE} = $config{CREATEADMIN};
	$config{SMTPDEST} = $config{CREATEADMIN};
	$config{AVUSER} = $config{CREATEADMIN};
	$config{SNMPNOTIFY} = "yes";
	$config{SMTPNOTIFY} = "yes";
	$config{STARTSERVERS} = "yes";

	$config{MODE} = "http";

	$config{CREATEADMINPASS} = "";

	getInstallStatus();

	if (!$options{c} && $newinstall) {

		if (lookupHostName ($config{HOSTNAME}, 'A')) {
			progress("\n\nDNS ERROR resolving $config{HOSTNAME}\n");
			progress("It is suggested that the hostname be resolveable via DNS\n");
			if (askYN("Change hostname","Yes") eq "yes") {
				setHostName();
			}
		}

		my $good = 0;

		if ($config{DOCREATEDOMAIN} = "yes") {
			my $ans = getDnsRecords($config{CREATEDOMAIN}, 'MX');
			if (!defined($ans)) {
				progress("\n\nDNS ERROR resolving MX for $config{CREATEDOMAIN}\n");
				progress("It is suggested that the domain name have an MX record configured in DNS\n");
				if (askYN("Change domain name?","Yes") eq "yes") {
					setCreateDomain();
				}
			} elsif (isEnabled("zimbra-mta")) {

				my @answer = $ans->answer;
				foreach my $a (@answer) {
					if ($a->type eq "MX") {
						my $h = getDnsRecords ($a->exchange,'A');
						my @ha = $h->answer;
						foreach $h (@ha) {
							if ($h->type eq 'A') {
								progress "\tMX: ".$a->exchange." (".$h->address.")\n";
							}
						}
					}
				}
				progress "\n";
				foreach my $i (@interfaces) {
					progress "\tInterface: $i\n";
				}
				foreach my $a (@answer) {
					foreach my $i (@interfaces) {
						if ($a->type eq "MX") {
							my $h = getDnsRecords ($a->exchange,'A');
							my @ha = $h->answer;
							foreach $h (@ha) {
								if ($h->type eq 'A') {
									print "\t\t".$h->address."\n";
									if ($h->address eq $i) {
										$good = 1;
										last;
									}
								}
							}
							if ($good) { last; }
						}
					}
					if ($good) {last;}
				}
				if (!$good) { 
					progress ("\n\nDNS ERROR - none of the MX records for $config{CREATEDOMAIN}\n");
					progress ("resolve to this host\n");
					if (askYN("Change domain name?","Yes") eq "yes") {
						setCreateDomain();
					}
				}

			}
		}

	}

	progress ( "Done\n" );
}

sub getInstallStatus {

	if (open H, "/opt/zimbra/.install_history") {

		my @history = <H>;
		close H;
		foreach my $h (@history) {
			if ($h =~ /CONFIG SESSION COMPLETE/) {
				next;
			}
			if ($h =~ /CONFIG SESSION START/) {
				%configStatus = ();
				next;
			}
			if ($h =~ /INSTALL SESSION COMPLETE/) {
				next;
			}
			if ($h =~ /INSTALL SESSION START/) {
				%installStatus = ();
				%configStatus = ();
				next;
			}
			my ($d, $op, $stage) = split ' ', $h;
			if ($op eq "INSTALLED" || $op eq "UPGRADED") {
				my $v = $stage;
				$stage =~ s/[-_]\d.*//;
				$installStatus{$stage}{op} = $op;
				$installStatus{$stage}{date} = $d;
				if ($stage eq "zimbra-core") {
					$prevVersion = $curVersion;
					$v =~ s/_HEAD.*//;
					$v =~ s/^zimbra-core[-_]//;
					$v =~ s/^(\d+\.\d+\.[^_]*_[^_]+_[^.]+).*/\1/;
					$curVersion = $v;
				}
			} elsif ($op eq "CONFIGURED") {
				$configStatus{$stage} = $op;
				if ($stage eq "END") {
					$prevVersion = $curVersion;
				}
			}
		}

		if ( ($installStatus{"zimbra-core"}{op} eq "INSTALLED") &&
			($configStatus{"END"} ne "CONFIGURED") ){
			$newinstall = 1;
		} else {
			$newinstall = 0;
			$config{DOCREATEDOMAIN} = "no";
			$config{DOCREATEADMIN} = "no";
			setDefaultsFromLocalConfig();
		}
	} else {
		$newinstall = 1;
	}
}

sub setDefaultsFromLocalConfig {
	progress ("Setting defaults from existing config...");
	$config{HOSTNAME} = getLocalConfig ("zimbra_server_hostname");
	$config{HOSTNAME} = lc ($config{HOSTNAME});
	my $ldapUrl = getLocalConfig ("ldap_url");
	my $ld = (split ' ', $ldapUrl)[0];
	my $p = $ld;
	$p =~ s/ldaps?:\/\///;
	$p =~ s/.*:?//;
	if ($p ne "") {
		$config{LDAPPORT} = $p;
	} else {
		$p = getLocalConfig ("ldap_port");
		if ($p ne "") {
			$config{LDAPPORT} = $p;
		}
	}
	my $h = $ld;
	$h =~ s/ldaps?:\/\///;
	$h =~ s/:\d*$//;
	if ($h ne "") {
		$config{LDAPHOST} = $h;
	} else {
		$h = getLocalConfig ("ldap_host");
		if ($h ne "") {
			$config{LDAPHOST} = $h;
		}
	}
	$config{LDAPPASS} = getLocalConfig ("ldap_root_password");
	$config{SQLROOTPASS} = getLocalConfig ("mysql_root_password");
	$config{LOGSQLROOTPASS} = getLocalConfig ("mysql_logger_root_password");
	$config{ZIMBRASQLPASS} = getLocalConfig ("zimbra_mysql_password");
	$config{ZIMBRALOGSQLPASS} = getLocalConfig ("zimbra_logger_mysql_password");
}

sub ask {
	my $prompt = shift;
	my $default = shift;
	if ($default eq "") {
		print "$prompt ";
	} else {
		print "$prompt [$default] ";
	}
	my $rc = <>;
	chomp $rc;
	if ($rc eq "") {return $default;}
	return $rc;
}

sub askYN {
	my $prompt = shift;
	my $default = shift;
	while (1) {
		my $v = ask($prompt, $default);
		$v = lc($v);
		$v = substr ($v,0,1);
		if ($v eq "y") {return "yes";}
		if ($v eq "n") {return "no";}
		print "A Yes/No answer is required\n";
	}
}

sub askNum {
	my $prompt = shift;
	my $default = shift;
	while (1) {
		my $v = ask($prompt, $default);
		my $i = int($v);
		if ($v eq $i) { return $v; }
		print "A numeric response is required!\n";
	}
}

sub askNonBlank {
	my $prompt = shift;
	my $default = shift;
	while (1) {
		my $v = ask($prompt, $default);
		if ($v ne "") {return $v;}
		print "A non-blank answer is required\n";
	}
}

sub setCreateDomain {
	my $oldDomain = $config{CREATEDOMAIN};
	my $good = 0;
	while (1) {
		$config{CREATEDOMAIN} =
			ask("Create Domain:",
				$config{CREATEDOMAIN});
		my $ans = getDnsRecords($config{CREATEDOMAIN}, 'MX');
		if (!defined ($ans)) {
			progress("\n\nDNS ERROR resolving MX for $config{CREATEDOMAIN}\n");
			progress("It is suggested that the domain name have an MX record configured in DNS\n");
			if (askYN("Re-Enter domain name?","Yes") eq "no") {
				last;
			}
			$config{CREATEDOMAIN} = $oldDomain;
			next;
		} elsif (isEnabled("zimbra-mta")) {

			my @answer = $ans->answer;
			foreach my $a (@answer) {
				if ($a->type eq "MX") {
					my $h = getDnsRecords ($a->exchange,'A');
					if (!defined ($h)) {
						progress "\tWarning: no 'A' record found for ".$a->exchange."\n";
						next;
					}
					my @ha = $h->answer;
					foreach $h (@ha) {
						if ($h->type eq 'A') {
							progress "\tMX: ".$a->exchange." (".$h->address.")\n";
						}
					}
				}
			}
			progress "\n";
			foreach my $i (@interfaces) {
				progress "\tInterface: $i\n";
			}
			foreach my $a (@answer) {
				foreach my $i (@interfaces) {
					if ($a->type eq "MX") {
						my $h = getDnsRecords ($a->exchange,'A');
						if (!defined ($h)) {
							progress "\tWarning: no 'A' record found for ".$a->exchange."\n";
							next;
						}
						my @ha = $h->answer;
						foreach $h (@ha) {
							if ($h->type eq 'A') {
								if ($h->address eq $i) {
									$good = 1;
									last;
								}
							}
						}
						if ($good) { last; }
					}
				}
				if ($good) { last; }
			}
			if ($good) { last; }
			else {
				progress ("\n\nDNS ERROR - none of the MX records for $config{CREATEDOMAIN}\n");
				progress ("resolve to this host\n");
				progress ("It is suggested that the MX record resolve to this host\n");
				if (askYN("Re-Enter domain name?","Yes") eq "no") {
					last;
				}
				$config{CREATEDOMAIN} = $oldDomain;
				next;
			}

		}
		last;
	}
	my ($u,$d) = split ('@', $config{CREATEADMIN});
	my $old = $config{CREATEADMIN};
	$config{CREATEADMIN} = $u.'@'.$config{CREATEDOMAIN};

	if ($old eq $config{AVUSER}) {
		$config{AVUSER} = $config{CREATEADMIN};
	}
	if ($old eq $config{SMTPDEST}) {
		$config{SMTPDEST} = $config{CREATEADMIN};
	}
	if ($old eq $config{SMTPSOURCE}) {
		$config{SMTPSOURCE} = $config{CREATEADMIN};
	}
	my ($spamUser, $spamDomain) = split ('@', $config{TRAINSASPAM});
	my ($hamUser, $hamDomain) = split ('@', $config{TRAINSAHAM});
	my ($notebookUser, $notebookDomain) = split ('@', $config{NOTEBOOKACCOUNT});
	if ($spamDomain eq $oldDomain) {
		$config{TRAINSASPAM} = $spamUser.'@'.$config{CREATEDOMAIN};
	}
	if ($hamDomain eq $oldDomain) {
		$config{TRAINSAHAM} = $hamUser.'@'.$config{CREATEDOMAIN};
	}
	if ($notebookDomain eq $oldDomain) {
		$config{NOTEBOOKACCOUNT} = $notebookUser.'@'.$config{CREATEDOMAIN};
	}
}

sub setTrainSASpam {
	while (1) {
		my $new = 
			ask("Spam training user:",
				$config{TRAINSASPAM});
		my ($u,$d) = split ('@', $new);
		if ($d ne $config{CREATEDOMAIN}) {
			progress ( "You must create the user under the domain $config{CREATEDOMAIN}\n" );
		} else {
			$config{TRAINSASPAM} = $new;
			last;
		}
	}
}

sub setTrainSAHam {
	while (1) {
		my $new = 
			ask("Ham training user:",
				$config{TRAINSAHAM});
		my ($u,$d) = split ('@', $new);
		if ($d ne $config{CREATEDOMAIN}) {
			progress ( "You must create the user under the domain $config{CREATEDOMAIN}\n" );
		} else {
			$config{TRAINSAHAM} = $new;
			last;
		}
	}
}

sub setCreateAdmin {

	my $new = 
		ask("Create admin user:",
			$config{CREATEADMIN});
	my ($u,$d) = split ('@', $new);
	if ($config{CREATEADMIN} eq $config{AVUSER}) {
		$config{AVUSER} = $new;
	}
	if ($config{CREATEADMIN} eq $config{SMTPDEST}) {
		$config{SMTPDEST} = $new;
	}
	if ($config{CREATEADMIN} eq $config{SMTPSOURCE}) {
		$config{SMTPSOURCE} = $new;
	}
	$config{CREATEADMIN} = $new;

	setAdminPass();

}

sub setLdapPass {
	while (1) {
		my $new =
			askNonBlank("Password for ldap server (min 6 characters):",
				$config{LDAPPASS});
		if (length($new) >= 6) {
			if ($config{LDAPPASS} ne $new) {
				$config{LDAPPASS} = $new;
				$ldapPassChanged = 1;
			}
			return;
		} else {
			print "Minimum length of 6 characters!\n";
		}
	}
}

sub setAdminPass {
	if ($config{CREATEADMIN} ne "") {
		while (1) {
			if ($config{CREATEADMINPASS} eq "") { $config{CREATEADMINPASS} = genRandomPass(); }
			my $new =
				askNonBlank("Password for $config{CREATEADMIN} (min 6 characters):",
					$config{CREATEADMINPASS});
			if (length($new) >= 6) {
				$config{CREATEADMINPASS} = $new;
				return;
			} else {
				print "Minimum length of 6 characters!\n";
			}
		}
	}
}

sub setSmtpSource {
	$config{SMTPSOURCE} =
		askNonBlank("SMTP Source address:",
			$config{SMTPSOURCE});
}

sub setSmtpDest {
	$config{SMTPDEST} =
		askNonBlank("SMTP Destination address:",
			$config{SMTPDEST});
}

sub setSnmpTrapHost {
	$config{SNMPTRAPHOST} = 
		askNonBlank("SNMP Trap host:",
			$config{SNMPTRAPHOST});
}

sub setAvUser {
	$config{AVUSER} = 
		askNonBlank("Notification address for AV alerts:",
			$config{AVUSER});
	(undef, $config{AVDOMAIN}) = (split ('@',$config{AVUSER}))[1];
}

sub toggleYN {
	my $key = shift;
	$config{$key} = ($config{$key} eq "yes")?"no":"yes";
}

sub setUseImapProxy {
	$config{USEIMAPPROXY} = ($config{USEIMAPPROXY} eq "yes")?"no":"yes";

	if ($config{USEIMAPPROXY} eq "yes") {
		if ($config{IMAPPROXYPORT} == $config{IMAPPORT}) {
			$config{IMAPPORT} = 7000+$config{IMAPPROXYPORT};
		}
		if ($config{IMAPSSLPROXYPORT} == $config{IMAPSSLPORT}) {
			$config{IMAPSSLPORT} = 7000+$config{IMAPSSLPROXYPORT};
		}
		if ($config{POPPROXYPORT} == $config{POPPORT}) {
			$config{POPPORT} = 7000+$config{POPPROXYPORT};
		}
		if ($config{POPSSLPROXYPORT} == $config{POPSSLPORT}) {
			$config{POPSSLPORT} = 7000+$config{POPSSLPROXYPORT};
		}
	} else {
		if ($config{IMAPPROXYPORT}+7000 == $config{IMAPPORT}) {
			$config{IMAPPORT} = $config{IMAPPROXYPORT};
		}
		if ($config{IMAPSSLPROXYPORT}+7000 == $config{IMAPSSLPORT}) {
			$config{IMAPSSLPORT} = $config{IMAPSSLPROXYPORT};
		}
		if ($config{POPPROXYPORT}+7000 == $config{POPPORT}) {
			$config{POPPORT} = $config{POPPROXYPORT};
		}
		if ($config{POPSSLPROXYPORT}+7000 == $config{POPSSLPORT}) {
			$config{POPSSLPORT} = $config{POPSSLPROXYPORT};
		}
	}
}

sub setStoreMode {
	while (1) {
		my $m = 
			askNonBlank("Please enter the web server mode (http,https,both,mixed)",
				$config{MODE});
		if ($m eq "http" || $m eq "https" || $m eq "mixed" || $m eq "both") {
			$config{MODE} = $m;
			return;
		}
		print "Please enter a valid mode!\n";
	}
}

sub changeLdapHost {
	$config{LDAPHOST} = shift;
}

sub changeLdapPort {
	$config{LDAPPORT} = shift;
}

sub getDnsRecords {
	my $name = shift;
	my $qtype = shift;

	my $res = Net::DNS::Resolver->new;
	my @servers = $res->nameservers();
	my $ans = $res->search ($name, $qtype);

	return $ans;
}

sub lookupHostName { 
	my $name = shift;
	my $qtype = shift;

	my $res = Net::DNS::Resolver->new;
	my @servers = $res->nameservers();
	my $ans = $res->search ($name, $qtype);
	if (!defined ($ans)) {
		progress ("No results returned for $qtype lookup of $name\n");
		progress ("Checked nameservers:\n");
		foreach (@servers) {
			progress ("\t$_\n");
		}
		return 1;
	} else {
		#progress ("Received answer:\n");
		#progress ($ans->string()."\n");
		return 0;
	}
}

sub setHostName {
	my $old = $config{HOSTNAME};
	while (1) {
		$config{HOSTNAME} = 
			askNonBlank("Please enter the logical hostname for this host",
				$config{HOSTNAME});
		if (lookupHostName ($config{HOSTNAME}, 'A')) {
			progress("\n\nDNS ERROR resolving $config{HOSTNAME}\n");
			progress("It is suggested that the hostname be resolveable via DNS\n");
			if (askYN("Re-Enter hostname","Yes") eq "no") {
				last;
			}
			$config{HOSTNAME} = $old;
		} else {last;}
	}
	$config{HOSTNAME} = lc($config{HOSTNAME});
	if ($config{SMTPHOST} eq $old) {
		$config{SMTPHOST} = $config{HOSTNAME};
	}
	if ($config{SNMPTRAPHOST} eq $old) {
		$config{SNMPTRAPHOST} = $config{HOSTNAME};
	}
	if ($config{LDAPHOST} eq $old) {
		changeLdapHost($config{HOSTNAME});
	}
	if ($config{MTAAUTHHOST} eq $old) {
		$config{MTAAUTHHOST} = $config{HOSTNAME};
	}
	if ($config{CREATEDOMAIN} eq $old) {
		$config{CREATEDOMAIN} = $config{HOSTNAME};
		my ($u,$d) = split ('@', $config{CREATEADMIN});
		$config{CREATEADMIN} = $u.'@'.$config{CREATEDOMAIN};
	}
	my ($suser,$sdomain) = split ('@', $config{SMTPSOURCE}, 2);
	if ($sdomain eq $old) {
		$config{SMTPSOURCE} = $suser.'@'.$config{CREATEDOMAIN};
	}
	($suser,$sdomain) = split ('@', $config{SMTPDEST}, 2);
	if ($sdomain eq $old) {
		$config{SMTPDEST} = $suser.'@'.$config{CREATEDOMAIN};
	}
	if ($config{SPELLURL} eq "http://${old}:7780/aspell.php") {
		$config{SPELLURL} = "http://$config{HOSTNAME}:7780/aspell.php";
	}
}

sub setSmtpHost {
	$config{SMTPHOST} = 
		askNonBlank("Please enter the SMTP server hostname",
			$config{SMTPHOST});
}

sub setMtaAuthHost {
	$config{MTAAUTHHOST} = askNonBlank("Please enter the mta authentication server hostname",
			$config{MTAAUTHHOST});
}

sub setLdapHost {
	changeLdapHost( askNonBlank("Please enter the ldap server hostname",
			$config{LDAPHOST}));
}

sub setLdapPort {
	changeLdapPort( askNum("Please enter the ldap server port",
			$config{LDAPPORT}));
}

sub setHttpPort {
	$config{HTTPPORT} = askNum("Please enter the HTTP server port",
			$config{HTTPPORT});
}

sub setHttpsPort {
	$config{HTTPSPORT} = askNum("Please enter the HTTPS server port",
			$config{HTTPSPORT});
}

sub setImapPort {
	$config{IMAPPORT} = askNum("Please enter the IMAP server port",
			$config{IMAPPORT});
}

sub setImapSSLPort {
	$config{IMAPSSLPORT} = askNum("Please enter the IMAP SSL server port",
			$config{IMAPSSLPORT});
}

sub setPopPort {
	$config{POPPORT} = askNum("Please enter the POP server port",
			$config{POPPORT});
}

sub setPopSSLPort {
	$config{POPSSLPORT} = askNum("Please enter the POP SSL server port",
			$config{POPSSLPORT});
}

sub setSpellUrl {
	$config{SPELLURL} = askNonBlank("Please enter the spell server URL", 
		$config{SPELLURL});
}

sub configurePackage {
	my $package = shift;
	if ($package eq "zimbra-logger") {
		configureLogger($package);
	} elsif ($package eq "zimbra-ldap") {
		configureLdap($package);
	} elsif ($package eq "zimbra-mta") {
		configureMta($package);
	} elsif ($package eq "zimbra-snmp") {
		configureSnmp($package);
	} elsif ($package eq "zimbra-spell") {
		configureSpell($package);
	} elsif ($package eq "zimbra-store") {
		configureStore($package);
	}
}

sub setEnabledDependencies {
	if (isEnabled("zimbra-ldap")) {
		if ($config{LDAPHOST} eq "") {
			changeLdapHost($config{HOSTNAME});
		}
	} else {
		if ($config{LDAPHOST} eq $config{HOSTNAME}) {
			changeLdapHost("");
			$config{LDAPPASS} = "";
		}
	}

	if (isEnabled("zimbra-store")) {
		if (isEnabled("zimbra-mta")) {
			$config{SMTPHOST} = $config{HOSTNAME};
		}
	}
	if (isEnabled("zimbra-mta")) {
		$config{RUNAV} = "yes";
		$config{RUNSA} = "yes";
	}

	if (isEnabled("zimbra-spell")) {
		$config{USESPELL} = "yes";
		$config{SPELLURL} = "http://$config{HOSTNAME}:7780/aspell.php";
	}
}

sub toggleEnabled {
	my $p = shift;
	$enabledPackages{$p} = (isEnabled($p))?"Disabled":"Enabled";
	setEnabledDependencies();
}

sub verifyQuit {
	if (askYN("Quit without applying changes?", "No") eq "yes") {return 1;}
	return 0;
}

sub genPackageMenu {
	my $package = shift;
	my %lm = ();
	$lm{menuitems}{1} = { 
		"prompt" => "Status:", 
		"var" => \$enabledPackages{$package},
		"callback" => \&toggleEnabled,
		"arg" => $package};
	$lm{promptitem} = { 
		"selector" => "r", 
		"prompt" => "Select, or 'r' for previous menu ", 
		"action" => "return"};
	$lm{default} = "r";
	return \%lm;
}

sub isEnabled {
	my $package = shift;
	return ($enabledPackages{$package} eq "Enabled");
}

sub createPackageMenu {
	my $package = shift;
	if ($package eq "zimbra-logger") {
		return createLoggerMenu($package);
	} elsif ($package eq "zimbra-ldap") {
		return createLdapMenu($package);
	} elsif ($package eq "zimbra-mta") {
		return createMtaMenu($package);
	} elsif ($package eq "zimbra-snmp") {
		return createSnmpMenu($package);
	} elsif ($package eq "zimbra-spell") {
		return createSpellMenu($package);
	} elsif ($package eq "zimbra-store") {
		return createStoreMenu($package);
	}
}

sub createLdapMenu {
	my $package = shift;
	my $lm = genPackageMenu($package);

	$$lm{title} = "Ldap configuration";

	$$lm{createsub} = \&createLdapMenu;
	$$lm{createarg} = $package;

	my $i = 2;
	if (isEnabled($package)) {
#		$$lm{menuitems}{$i} = { 
#			"prompt" => "Ldap host:", 
#			"var" => \$config{LDAPHOST}, 
#			"callback" => \&setLdapHost
#			};
#		$i++;
#		$$lm{menuitems}{$i} = { 
#			"prompt" => "Ldap port:", 
#			"var" => \$config{LDAPPORT}, 
#			"callback" => \&setLdapPort
#			};
#		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "Create Domain:", 
			"var" => \$config{DOCREATEDOMAIN}, 
			"callback" => \&toggleYN,
			"arg" => "DOCREATEDOMAIN",
			};
		$i++;
		if ($config{DOCREATEDOMAIN} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "Domain to create:", 
				"var" => \$config{CREATEDOMAIN}, 
				"callback" => \&setCreateDomain,
				};
			$i++;
		}

	}
	return $lm;
}

sub configureLdap {
	my $package = shift;

	my $lm = createLdapMenu($package);

	displayMenu($lm);
}

sub createSpellMenu {
	my $package = shift;
	my $lm = genPackageMenu($package);

	$$lm{title} = "Spell configuration";

	$$lm{createsub} = \&createSpellMenu;
	$$lm{createarg} = $package;

	my $i = 2;

	if (isEnabled($package)) {
#		$$lm{menuitems}{$i} = { 
#			"prompt" => "Enable SMTP notifications:", 
#			"var" => \$config{SMTPNOTIFY}, 
#			"callback" => \&toggleYN,
#			"arg" => "SMTPNOTIFY",
#			};
#		$i++;
	}
	return $lm;
}

sub configureSpell {
	my $package = shift;

	my $lm = createSpellMenu($package);

	displayMenu($lm);
}

sub createSnmpMenu {
	my $package = shift;
	my $lm = genPackageMenu($package);

	$$lm{title} = "Snmp configuration";

	$$lm{createsub} = \&createSnmpMenu;
	$$lm{createarg} = $package;

	my $i = 2;
	if (isEnabled($package)) {
		$$lm{menuitems}{$i} = { 
			"prompt" => "Enable SNMP notifications:", 
			"var" => \$config{SNMPNOTIFY}, 
			"callback" => \&toggleYN,
			"arg" => "SNMPNOTIFY",
			};
		$i++;
		if ($config{SNMPNOTIFY} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "SNMP Trap hostname:", 
				"var" => \$config{SNMPTRAPHOST}, 
				"callback" => \&setSnmpTrapHost,
				};
			$i++;
		}
		$$lm{menuitems}{$i} = { 
			"prompt" => "Enable SMTP notifications:", 
			"var" => \$config{SMTPNOTIFY}, 
			"callback" => \&toggleYN,
			"arg" => "SMTPNOTIFY",
			};
		$i++;
		if ($config{SMTPNOTIFY} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "SMTP Source email address:", 
				"var" => \$config{SMTPSOURCE}, 
				"callback" => \&setSmtpSource,
				};
			$i++;
			$$lm{menuitems}{$i} = { 
				"prompt" => "SMTP Destination email address:", 
				"var" => \$config{SMTPDEST}, 
				"callback" => \&setSmtpDest,
				};
			$i++;
		}
	}
	return $lm;
}

sub configureSnmp {
	my $package = shift;

	my $lm = createSnmpMenu($package);

	displayMenu($lm);
}

sub createMtaMenu {
	my $package = shift;
	my $lm = genPackageMenu($package);

	$$lm{title} = "Mta configuration";

	$$lm{createsub} = \&createMtaMenu;
	$$lm{createarg} = $package;

	my $i = 2;
	if (isEnabled($package)) {
		$$lm{menuitems}{$i} = { 
			"prompt" => "MTA Auth host:", 
			"var" => \$config{MTAAUTHHOST}, 
			"callback" => \&setMtaAuthHost,
			"arg" => "MTAAUTHHOST",
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "Enable Spamassassin:", 
			"var" => \$config{RUNSA}, 
			"callback" => \&toggleYN,
			"arg" => "RUNSA",
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "Enable Clam AV:", 
			"var" => \$config{RUNAV}, 
			"callback" => \&toggleYN,
			"arg" => "RUNAV",
			};
		$i++;
		if ($config{RUNAV} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "Notification address for AV alerts:", 
				"var" => \$config{AVUSER}, 
				"callback" => \&setAvUser,
				};
			$i++;
		}
	}
	return $lm;
}

sub configureMta {
	my $package = shift;

	my $lm = createMtaMenu($package);

	displayMenu($lm);
}

sub createStoreMenu {
	my $package = shift;
	my $lm = genPackageMenu($package);

	$$lm{title} = "Store configuration";

	$$lm{createsub} = \&createStoreMenu;
	$$lm{createarg} = $package;

	my $i = 2;
	if (isEnabled($package)) {
		$$lm{menuitems}{$i} = { 
			"prompt" => "Create Admin User:", 
			"var" => \$config{DOCREATEADMIN}, 
			"callback" => \&toggleYN,
			"arg" => "DOCREATEADMIN",
			};
		$i++;
		if ($config{DOCREATEADMIN} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "Admin user to create:", 
				"var" => \$config{CREATEADMIN}, 
				"callback" => \&setCreateAdmin
				};
			$i++;
			if ($config{CREATEADMINPASS} ne "") {
				$config{ADMINPASSSET} = "set";
			} else {
				$config{ADMINPASSSET} = "UNSET";
			}
			$$lm{menuitems}{$i} = { 
				"prompt" => "Admin Password", 
				"var" => \$config{ADMINPASSSET},
				"callback" => \&setAdminPass
				};
			$i++;
		}
		$$lm{menuitems}{$i} = { 
			"prompt" => "Enable automated spam training:", 
			"var" => \$config{DOTRAINSA}, 
			"callback" => \&toggleYN,
			"arg" => "DOTRAINSA",
			};
		$i++;
		if ($config{DOTRAINSA} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "Spam training user:", 
				"var" => \$config{TRAINSASPAM}, 
				"callback" => \&setTrainSASpam
				};
			$i++;
			$$lm{menuitems}{$i} = { 
				"prompt" => "Non-spam(Ham) training user:", 
				"var" => \$config{TRAINSAHAM}, 
				"callback" => \&setTrainSAHam
				};
			$i++;
		}
		$$lm{menuitems}{$i} = { 
			"prompt" => "SMTP host:", 
			"var" => \$config{SMTPHOST}, 
			"callback" => \&setSmtpHost,
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "Web server HTTP port:", 
			"var" => \$config{HTTPPORT}, 
			"callback" => \&setHttpPort,
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "Web server HTTPS port:", 
			"var" => \$config{HTTPSPORT}, 
			"callback" => \&setHttpsPort,
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "Web server mode:", 
			"var" => \$config{MODE}, 
			"callback" => \&setStoreMode,
			};
		$i++;

		$$lm{menuitems}{$i} = { 
			"prompt" => "Enable POP/IMAP proxy:", 
			"var" => \$config{USEIMAPPROXY}, 
			"callback" => \&setUseImapProxy,
			};
		$i++;
		if ($config{USEIMAPPROXY} eq "yes") {

			$$lm{menuitems}{$i} = { 
				"prompt" => "IMAP proxy port:", 
				"var" => \$config{IMAPPROXYPORT}, 
				"callback" => \&setImapProxyPort,
				};
			$i++;
			$$lm{menuitems}{$i} = { 
				"prompt" => "IMAP SSL proxy port:", 
				"var" => \$config{IMAPSSLPROXYPORT}, 
				"callback" => \&setImapSSLProxyPort,
				};
			$i++;
			$$lm{menuitems}{$i} = { 
				"prompt" => "POP proxy port:", 
				"var" => \$config{POPPROXYPORT}, 
				"callback" => \&setPopProxyPort,
				};
			$i++;
			$$lm{menuitems}{$i} = { 
				"prompt" => "POP SSL proxy port:", 
				"var" => \$config{POPSSLPROXYPORT}, 
				"callback" => \&setPopSSLProxyPort,
				};
			$i++;

		}

		$$lm{menuitems}{$i} = { 
			"prompt" => "IMAP server port:", 
			"var" => \$config{IMAPPORT}, 
			"callback" => \&setImapPort,
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "IMAP server SSL port:", 
			"var" => \$config{IMAPSSLPORT}, 
			"callback" => \&setImapSSLPort,
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "POP server port:", 
			"var" => \$config{POPPORT}, 
			"callback" => \&setPopPort,
			};
		$i++;
		$$lm{menuitems}{$i} = { 
			"prompt" => "POP server SSL port:", 
			"var" => \$config{POPSSLPORT}, 
			"callback" => \&setPopSSLPort,
			};
		$i++;

		$$lm{menuitems}{$i} = { 
			"prompt" => "Use spell check server:", 
			"var" => \$config{USESPELL}, 
			"callback" => \&toggleYN,
			"arg" => "USESPELL",
			};
		$i++;
		if ($config{USESPELL} eq "yes") {
			$$lm{menuitems}{$i} = { 
				"prompt" => "Spell server URL:", 
				"var" => \$config{SPELLURL}, 
				"callback" => \&setSpellUrl,
				};
			$i++;
		}
	}
	return $lm;
}

sub configureStore {
	my $package = shift;

	my $lm = createStoreMenu($package);

	displayMenu($lm);
}

sub createLoggerMenu {
	my $package = shift;
	my $lm = genPackageMenu($package);

	$$lm{title} = "Logger configuration";

	$$lm{createsub} = \&createLoggerMenu;
	$$lm{createarg} = $package;

	if (isEnabled($package)) {
	}
	return $lm;
}

sub configureLogger {
	my $package = shift;

	my $lm = createLoggerMenu($package);

	displayMenu($lm);
}

sub displaySubMenuItems {
	my $items = shift;
	my $parentmenuvar = shift;
	my $indent = shift;

	if (defined($$items{createsub})) {
		$items = &{$$items{createsub}}($$items{createarg});
	}
#	print "$indent$$items{title}\n";
	foreach my $i (sort menuSort keys %{$$items{menuitems}}) {
		if (defined($$items{menuitems}{$i}{var}) &&
			$$items{menuitems}{$i}{var} == $parentmenuvar) {next;}
		my $len = 44-(length($indent));
		my $v;
		my $ind = $indent;
		if (defined $$items{menuitems}{$i}{var}) {
			$v = ${$$items{menuitems}{$i}{var}};
			if ($v eq "" || $v eq "none" || $v eq "UNSET") { $v = "UNSET"; $ind=~s/ /*/g; }
		}
		printf ("%s +%-${len}s %-30s\n", $ind,
			$$items{menuitems}{$i}{prompt}, $v);
		if (defined ($$items{menuitems}{$i}{submenu}) ) {
			displaySubMenuItems($$items{menuitems}{$i}{submenu},"$indent  ");
		}
	}
}

sub menuSort {
	if ( ($a eq int($a)) && ($b eq int($b)) ) {
		return $a <=> $b;
	}
	return $a cmp $b;
}

sub displayMenu {
	my $items = shift;
	while (1) {
		if (defined($$items{createsub})) {
			$items = &{$$items{createsub}}($$items{createarg});
		}

		print "\n$$items{title}\n\n";
		foreach my $i (sort menuSort keys %{$$items{menuitems}}) {
			my $v;
			my $ind = "  ";
			if (defined $$items{menuitems}{$i}{var}) {
				$v = ${$$items{menuitems}{$i}{var}};
				if ($v eq "" || $v eq "none" || $v eq "UNSET") { $v = "UNSET"; $ind="**"; }
			}
			my $subMenuCheck = 1;
			if (defined ($$items{menuitems}{$i}{submenu}) || 
				defined ($$items{menuitems}{$i}{callback}) ) {
				if (defined ($$items{menuitems}{$i}{submenu})) {
					$subMenuCheck = checkMenuConfig($$items{menuitems}{$i}{submenu});
				}
				printf ("${ind}%2s) %-40s %-30s\n", $i, 
					$$items{menuitems}{$i}{prompt}, $v);
			} else {
				# Disabled items
				printf ("${ind}    %-40s %-30s\n", 
					$$items{menuitems}{$i}{prompt}, $v);
			}
			if ($config{EXPANDMENU} eq "yes" || !$subMenuCheck) {
				if (defined ($$items{menuitems}{$i}{submenu}) ) {
					displaySubMenuItems($$items{menuitems}{$i}{submenu},
						$$items{menuitems}{$i}{var},"       ");
					print "\n";
				}
			}
		}
		if (defined($$items{lastitem})) {
			printf ("  %2s) %-40s\n", $$items{lastitem}{selector}, 
				$$items{lastitem}{prompt});
		}
		my $menuprompt = "\n";
		if (defined($$items{promptitem})) {
			$menuprompt .= $$items{promptitem}{prompt};
		} else {
			$menuprompt .= "Select ";
		}
		if (defined($$items{help})) {
			$menuprompt .= " (? - help) ";
		}
		print "$menuprompt";
		if (defined $$items{default}) {
			print "[$$items{default}] ";
		}
		my $r = <>;
		chomp $r;
		if ($r eq "") { $r = $$items{default}; }
		if ($r eq "") { next; }
		if ($r eq $$items{lastitem}{selector}) {
			if ($$items{lastitem}{action} eq "quit") {
				if (verifyQuit()) {
					exit 0;
				}
			} elsif ($$items{lastitem}{action} eq "return") {
				return;
			}
		} elsif (defined $$items{help} && $r eq "?") {
			print "\n\n";
			print $$items{help}{helptext};
			print "\n";
			ask("Press any key to continue", "");
			print "\n\n";
		} elsif (defined $$items{promptitem} && $r eq $$items{promptitem}{selector}) {
			if (defined $$items{promptitem}{callback}) {
				&{$$items{promptitem}{callback}}($$items{promptitem}{arg});
			} elsif (defined $$items{promptitem}{action}) {
				if ($$items{promptitem}{action} eq "quit") {
					if (verifyQuit()) {
						exit 0;
					}
				} elsif ($$items{promptitem}{action} eq "return") {
					return;
				}
			}
		} elsif (defined $$items{menuitems}{$r}) {
			print "\n";
			if (defined $$items{menuitems}{$r}{callback}) {
				&{$$items{menuitems}{$r}{callback}}($$items{menuitems}{$r}{arg});
			} elsif (defined ($$items{menuitems}{$r}{submenu})) {
				displayMenu($$items{menuitems}{$r}{submenu});
			}
		} else {
			ask("Invalid selection! - press any key to continue", "");
			print "\n\n";
		}
	}
}

sub createMainMenu {
	my %mm = ();
	$mm{createsub} = \&createMainMenu;
	$mm{title} = "Main menu";
	$mm{help} = {
		"selector" => "?",
		"prompt" => "Help",
		"action" => "help",
		"helptext" => 
			"Main Menu help\n\n".
			"Items marked with ** MUST BE CONFIGURED prior to applying configuration\n\n".
			"",
		};
	$mm{lastitem} = {
		"selector" => "q",
		"prompt" => "Quit",
		"action" => "quit",
		};
	$mm{menuitems}{1} = { 
		"prompt" => "Hostname:", 
		"var" => \$config{HOSTNAME}, 
		"callback" => \&setHostName
		};
	my $i = 2;
	$mm{menuitems}{$i} = { 
		"prompt" => "Ldap master host:", 
		"var" => \$config{LDAPHOST}, 
		"callback" => \&setLdapHost
		};
	$i++;
	$mm{menuitems}{$i} = { 
		"prompt" => "Ldap port:", 
		"var" => \$config{LDAPPORT}, 
		"callback" => \&setLdapPort
		};
	$i++;
	if ($config{LDAPPASS} ne "") {
		$config{LDAPPASSSET} = "set";
	} else {
		$config{LDAPPASSSET} = "UNSET";
	}
	$mm{menuitems}{$i} = { 
		"prompt" => "Ldap password:", 
		"var" => \$config{LDAPPASSSET}, 
		"callback" => \&setLdapPass
		};
	$i++;
	foreach (@packageList) {
		if ($_ eq "zimbra-core") {next;}
		if ($_ eq "zimbra-apache") {next;}
		if (defined($installedPackages{$_})) {
			if ($_ eq "zimbra-logger") {
				$mm{menuitems}{$i} = { 
					"prompt" => "$_:", 
					"var" => \$enabledPackages{$_},
					"callback" => \&toggleEnabled, 
					"arg" => $_
				};
				$i++;
				next;
			}
			my $submenu = createPackageMenu($_);
			$mm{menuitems}{$i} = { 
				"prompt" => "$_:", 
				"var" => \$enabledPackages{$_},
				"submenu" => $submenu,
			};
			$i++;
		} else {
			#push @mm, "$_ not installed";
		}
	}
	$i = &preinstall::mainMenuExtensions(\%mm, $i);
	$mm{menuitems}{r} = { 
		"prompt" => "Start servers after configuration", 
		"callback" => \&toggleYN,
		"var" => \$config{STARTSERVERS},
		"arg" => "STARTSERVERS"
		};
	if ($config{EXPANDMENU} eq "yes") {
		$mm{menuitems}{c} = { 
			"prompt" => "Collapse menu", 
			"callback" => \&toggleYN,
			"arg" => "EXPANDMENU"
			};
	} else {
		$mm{menuitems}{x} = { 
			"prompt" => "Expand menu", 
			"callback" => \&toggleYN,
			"arg" => "EXPANDMENU"
			};
	}
	# Allow save of even incomplete config
	$mm{menuitems}{s} = { 
		"prompt" => "Save config to file", 
		"callback" => \&saveConfig,
		};
	if (checkMenuConfig(\%mm)) {
		$mm{promptitem} = { 
			"selector" => "a",
			"prompt" => "*** CONFIGURATION COMPLETE - press 'a' to apply\nSelect from menu, or press 'a' to apply config", 
			"callback" => \&applyConfig,
			};
	} else {
		$mm{promptitem} = { 
			"selector" => "qqazyre",
			"prompt" => "Address unconfigured (**) items ", 
			"callback" => \&applyConfig,
			};
		if (verifyLdap()) {
			$mm{promptitem}{prompt} .= "or correct ldap configuration ";
		}
	}
	return \%mm;
}

sub checkMenuConfig {
	my $items = shift;

	my $needldapverified = 0;

	foreach my $i (sort menuSort keys %{$$items{menuitems}}) {
		my $v;
		my $ind = "  ";
		if (defined $$items{menuitems}{$i}{var}) {
			$v = ${$$items{menuitems}{$i}{var}};
			if ($v eq "" || $v eq "none" || $v eq "UNSET") { return 0; }
			if ($$items{menuitems}{$i}{var} == \$config{LDAPHOST}) {
				$needldapverified = 1;
			}
			if ($$items{menuitems}{$i}{var} == \$config{LDAPPORT}) {
				$needldapverified = 1;
			}
		}
		if (defined ($$items{menuitems}{$i}{submenu}) ) {
			if (!checkMenuConfig($$items{menuitems}{$i}{submenu})) {
				return 0;
			}
		}
	}
	if ($needldapverified) {
		if (verifyLdap()) {
			return 0;
		}
	}
	return 1;
}

sub verifyLdap {
	# My laptop can't always find itself...
	my $H = $config{LDAPHOST};
	if (($config{LDAPHOST} eq $config{HOSTNAME}) && !$ldapConfigured) {
		return 0;
	}
	if ($config{LDAPPASS} eq "" || $config{LDAPPORT} eq "" || $config{LDAPHOST} eq "") {
		progress ( "ldap configuration not complete\n" );
		return 1;
	}
	progress ( "Checking ldap on ${H}:$config{LDAPPORT}..." );

	my $ldapsearch = "$zimbraHome/bin/ldapsearch";
	my $args = "-x -h ${H} -p $config{LDAPPORT} ".
		"-D 'uid=zimbra,cn=admins,cn=zimbra' -w $config{LDAPPASS}";

	my $rc = 0xffff & system ("$ldapsearch $args > /tmp/zmsetup.ldap.out 2>&1");

	if ($rc) { my $foo = `cat /tmp/zmsetup.ldap.out`; chomp $foo; progress ("FAILED ( $foo )\n"); } 
	else {
		progress ( "Success\n"); 
	}
	return $rc;

}

sub runAsZimbra {
	my $cmd = shift;
	if ($cmd =~ /init/ || $cmd =~ /zmprov -l ca/) {
		# Suppress passwords in log file
		my $c = (split ' ', $cmd)[0];
		detail ( "*** Running as zimbra user: $c\n" );
	} else {
		detail ( "*** Running as zimbra user: $cmd\n" );
	}
	my $rc;
	$rc = 0xffff & system("su - zimbra -c \"$cmd\" >> $logfile 2>&1");
	return $rc;
}

sub getLocalConfig {
	my $key = shift;
	detail ( "Getting local config $key\n" );
	my $val = `/opt/zimbra/bin/zmlocalconfig -s -m nokey ${key}`;
	chomp $val;
	return $val;
}

sub setLocalConfig {
	my $key = shift;
	my $val = shift;
	detail ( "Setting local config $key to $val\n" );
	runAsZimbra("/opt/zimbra/bin/zmlocalconfig -f -e ${key}=${val}");
}

sub configLCValues {

	if ($configStatus{configLCValues} eq "CONFIGURED") {
		configLog("configLCValues");
		return 0;
	}

	progress ("Setting local config values...");
	setLocalConfig ("zimbra_server_hostname", lc($config{HOSTNAME}));

	if ($config{LDAPPORT} == 636) {
		setLocalConfig ("ldap_master_url", "ldaps://$config{LDAPHOST}:$config{LDAPPORT}");
		setLocalConfig ("ldap_url", "ldaps://$config{LDAPHOST}:$config{LDAPPORT}");
	} else {
		setLocalConfig ("ldap_master_url", "ldap://$config{LDAPHOST}:$config{LDAPPORT}");
		setLocalConfig ("ldap_url", "ldap://$config{LDAPHOST}:$config{LDAPPORT}");
	}

	my $uid = `id -u zimbra`;
	chomp $uid;
	my $gid = `id -g zimbra`;
	chomp $gid;
	setLocalConfig ("zimbra_uid", $uid);
	setLocalConfig ("zimbra_gid", $gid);
	setLocalConfig ("zimbra_user", "zimbra");

	if (defined $config{AVUSER}) {
		setLocalConfig ("av_notify_user", $config{AVUSER})
	}
	if (defined $config{AVDOMAIN}) {
		setLocalConfig ("av_notify_domain", $config{AVDOMAIN})
	}

	setLocalConfig ("ssl_allow_untrusted_certs", "TRUE");

	configLog ("configLCValues");

	progress ("Done\n");

}

sub configCASetup {

	if ($configStatus{configCASetup} eq "CONFIGURED") {
		configLog("configCASetup");
		return 0;
	}

	if ( ! -f "/opt/zimbra/conf/ca/ca.key")  {
		progress ( "Setting up CA..." );
		runAsZimbra("cd /opt/zimbra; zmcreateca");

		progress ( "Done\n" );
	}
	configLog("configCASetup");
}

sub configSetupLdap {

	if ($configStatus{configSetupLdap} eq "CONFIGURED") {
		configLog("configSetupLdap");
		return 0;
	}

	if (!$ldapConfigured && isEnabled("zimbra-ldap") && ! -f "/opt/zimbra/.enable_replica" && $newinstall) {
		progress ( "Initializing ldap..." ) ;
		if (my $rc = runAsZimbra ("/opt/zimbra/libexec/zmldapinit $config{LDAPPASS}")) {
			progress ( "FAILED ($rc)\n" );
			failConfig();
		} else {
			progress ( "Done\n" );
		}
	} elsif (isEnabled("zimbra-ldap") && ! $newinstall) {
		# zmldappasswd starts ldap and re-applies the ldif
		if ( -f "/opt/zimbra/.enable_replica") {
			progress ( "Enabling ldap replication..." );
			runAsZimbra ("/opt/zimbra/libexec/zmldapenablereplica");
			unlink "/opt/zimbra/.enable_replica";
			progress ( "Done\n" );
		}
		if ($ldapPassChanged) {
			progress ( "Setting ldap password..." );
			runAsZimbra 
				("/opt/zimbra/openldap/sbin/slapindex -f /opt/zimbra/conf/slapd.conf");
			runAsZimbra ("/opt/zimbra/bin/zmldappasswd --root $config{LDAPPASS}");
			runAsZimbra ("/opt/zimbra/bin/zmldappasswd $config{LDAPPASS}");
			progress ( "Done\n" );
		} else {
			progress ( "Starting ldap..." );
			runAsZimbra 
				("/opt/zimbra/openldap/sbin/slapindex -f /opt/zimbra/conf/slapd.conf");
			runAsZimbra ("/opt/zimbra/bin/ldap start");
			runAsZimbra ("/opt/zimbra/libexec/zmldapapplyldif");
			progress ( "Done\n" );
		}
	} else {
		setLocalConfig ("ldap_root_password", $config{LDAPPASS});
		setLocalConfig ("zimbra_ldap_password", $config{LDAPPASS});
	}
	configLog("configSetupLdap");
	return 0;

}

sub configSaveCA {

	if ($configStatus{configSaveCA} eq "CONFIGURED") {
		configLog("configSaveCA");
		return 0;
	}

	if (isEnabled("zimbra-ldap")) {
		progress ( "Saving CA in ldap..." );

		my $cert=`cat /opt/zimbra/ssl/ssl/ca/ca.pem`;
		my $key=`cat /opt/zimbra/ssl/ssl/ca/ca.key`;
		chomp $cert;
		chomp $key;

		runAsZimbra("$ZMPROV mcf zimbraCertAuthorityCertSelfSigned \\\"$cert\\\"");
		runAsZimbra("$ZMPROV mcf zimbraCertAuthorityKeySelfSigned \\\"$key\\\"");

		progress ( "Done\n" );
	} else {
		# Fetch it from ldap

		progress ( "Fetching CA from ldap..." );

		runAsZimbra("mkdir -p /opt/zimbra/ssl/ssl/ca");

		# Don't use runAsZimbra since it swallows output
		my $rc;

		$rc = 0xffff & system("su - zimbra -c \"$ZMPROV gacf | sed -ne \'/-----BEGIN RSA PRIVATE KEY-----/,/-----END RSA PRIVATE KEY-----/ p\'| sed  -e \'s/^zimbraCertAuthorityKeySelfSigned: //\' > /opt/zimbra/ssl/ssl/ca/ca.key\"");

		$rc = 0xffff & system("su - zimbra -c \"$ZMPROV gacf | sed -ne \'/-----BEGIN TRUSTED CERTIFICATE-----/,/-----END TRUSTED CERTIFICATE-----/ p\'| sed  -e \'s/^zimbraCertAuthorityCertSelfSigned: //\' > /opt/zimbra/ssl/ssl/ca/ca.pem\"");

		progress ( "Done\n" );
	}
	configLog("configSaveCA");
}

sub configCreateCert {

	if ($configStatus{configCreateCert} eq "CONFIGURED") {
		configLog("configCreateCert");
		return 0;
	}

	if (isEnabled("zimbra-ldap") || isEnabled("zimbra-store") || isEnabled("zimbra-mta")) {

		progress ( "Creating SSL certificate..." );
		if (-f "/opt/zimbra/java/jre/lib/security/cacerts") {
			`chmod 777 /opt/zimbra/java/jre/lib/security/cacerts >> $logfile 2>&1`;
		}
		if (!-f "/opt/zimbra/tomcat/conf/keystore" || 
			!-f "/opt/zimbra/conf/smtpd.crt" ||
			!-f "/opt/zimbra/conf/slapd.crt") {
			runAsZimbra("cd /opt/zimbra; zmcreatecert");
		}
		if (-f "/opt/zimbra/java/jre/lib/security/cacerts") {
			`chmod 744 /opt/zimbra/java/jre/lib/security/cacerts >> $logfile 2>&1`;
		}
		progress ( "Done\n" );

	}

	configLog("configCreateCert");
}

sub configInstallCert {

	if ($configStatus{configInstallCert} eq "CONFIGURED") {
		configLog("configInstallCert");
		return 0;
	}

	if (isEnabled("zimbra-store") || isEnabled("zimbra-mta")) {
		progress ("Installing SSL certificate...");
		if (isEnabled("zimbra-store")) {
			if (!-f "/opt/zimbra/tomcat/conf/keystore") {
				runAsZimbra("cd /opt/zimbra; zmcertinstall mailbox");
			}
		}
		if (isEnabled("zimbra-mta")) {
			if (! (-f "/opt/zimbra/conf/smtpd.key" || 
				-f "/opt/zimbra/conf/smtpd.crt")) {
				runAsZimbra("cd /opt/zimbra; zmcertinstall mta ".
					"/opt/zimbra/ssl/ssl/server/server.crt ".
					"/opt/zimbra/ssl/ssl/server/server.key");
			}
		}
		progress ( "Done\n" );
	}
	configLog("configInstallCert");
}

sub configCreateServerEntry {

	if ($configStatus{configCreateServerEntry} eq "CONFIGURED") {
		configLog("configCreateServerEntry");
		return 0;
	}

	progress ( "Creating server entry for $config{HOSTNAME}..." );
	runAsZimbra("$ZMPROV cs $config{HOSTNAME}");
	progress ( "Done\n" );
	configLog("configCreateServerEntry");
}

sub configSpellServer {

	if ($configStatus{configSpellServer} eq "CONFIGURED") {
		configLog("configSpellServer");
		return 0;
	}

	if ($config{USESPELL} eq "yes") {
		progress ( "Setting spell check URL..." );
		runAsZimbra("$ZMPROV ms $config{HOSTNAME} ".
			"zimbraSpellCheckURL $config{SPELLURL}");
		progress ( "Done\n" );
	}

	configLog("configSpellServer");
}

sub configSetMtaAuthHost {

	if ($configStatus{configSetMtaAuthHost} eq "CONFIGURED") {
		configLog("configSetMtaAuthHost");
		return 0;
	}

	if (isEnabled ("zimbra-ldap") && ! isEnabled ("zimbra-store")) {
		progress ( "WARNING\n\nYou are configuring this host as an MTA server, but there are no\n");
		progress ( "currently configured mailstore servers.  This will cause smtp authentication\n");
		progress ( "to fail.\n");
		progress ( "To correct this - after installing a mailstore server, reset the zimbraMtaAuthHost\n");
		progress ( "attribute for this server:\n");
		progress ( "$ZMPROV ms $config{HOSTNAME} zimbraMtaAuthHost $config{MTAAUTHHOST}\n\n");
		progress ( "\nOnce done, start the MTA:\n");
		progress ( "zmmtactl start\n\n");
		if (!$options{c}) {
			ask ("Press return to continue\n","");
		}
	}
	if ($config{MTAAUTHHOST} ne "") {
		progress ( "Setting MTA auth host..." );
		runAsZimbra("$ZMPROV ms $config{HOSTNAME} ".
			"zimbraMtaAuthHost $config{MTAAUTHHOST}");
		progress ( "Done\n" );
	}

	configLog("configSetMtaAuthHost");
}

sub configSetServicePorts {

	if ($configStatus{configSetServicePorts} eq "CONFIGURED") {
		configLog("configSetServicePorts");
		return 0;
	}

	progress ( "Setting service ports on $config{HOSTNAME}..." );
	runAsZimbra("$ZMPROV ms $config{HOSTNAME} ".
		"zimbraImapBindPort $config{IMAPPORT} zimbraImapSSLBindPort $config{IMAPSSLPORT} ".
		"zimbraPop3BindPort $config{POPPORT} zimbraPop3SSLBindPort $config{POPSSLPORT} ");
	runAsZimbra("$ZMPROV ms $config{HOSTNAME} ".
		"zimbraImapProxyBindPort $config{IMAPPROXYPORT} zimbraImapSSLProxyBindPort $config{IMAPSSLPROXYPORT} ".
		"zimbraPop3ProxyBindPort $config{POPPROXYPORT} zimbraPop3SSLProxyBindPort $config{POPSSLPROXYPORT} ");
	runAsZimbra("$ZMPROV ms $config{HOSTNAME} ".
		"zimbraMailPort $config{HTTPPORT} zimbraMailSSLPort $config{HTTPSPORT} ".
		"zimbraMailMode $config{MODE}");

	progress ( "Done\n" );
	configLog("configSetServicePorts");
}

sub configSetInstalledSkins {
	if ($configStatus{configSetInstalledSkins} eq "CONFIGURED") {
		configLog("configSetInstalledSkins");
		return 0;
	}

	if (opendir DIR, "/opt/zimbra/tomcat/webapps/zimbra/skins") {
		progress ( "Installing skins... " );
		runAsZimbra("$ZMPROV mcf zimbraInstalledSkin ''");
		my @skins = grep { !/^[\._]/ } readdir(DIR);
		foreach my $skindir (@skins) {
			if (-d "/opt/zimbra/tomcat/webapps/zimbra/skins/$skindir") {
				my $skin = $skindir;
				runAsZimbra("$ZMPROV mcf +zimbraInstalledSkin $skin");
				print  ("\n\t$skin");
			}
		}
		progress ( "\nDone\n" );
	}

	configLog("configSetInstalledSkins");
}

sub configInstallZimlets {

	if ($configStatus{configInstallZimlets} eq "CONFIGURED") {
		configLog("configInstallZimlets");
		return 0;
	}

	# Install zimlets
	if (opendir DIR, "/opt/zimbra/zimlets") {
		progress ( "Installing zimlets... " );
		my @zimlets = grep { !/^\./ } readdir(DIR);
		foreach my $zimletfile (@zimlets) {
			my $zimlet = $zimletfile;
			$zimlet =~ s/\.zip$//;
			progress  ("\n\t$zimlet");
			runAsZimbra ("/opt/zimbra/bin/zmzimletctl deploy zimlets/$zimletfile");
		}
		progress ( "\nDone\n" );
	}

	# Install zimlets
	if (opendir DIR, "/opt/zimbra/zimlets-network") {
		progress ( "Installing network zimlets... " );
		my @zimlets = grep { !/^\./ } readdir(DIR);
		foreach my $zimletfile (@zimlets) {
			my $zimlet = $zimletfile;
			$zimlet =~ s/\.zip$//;
			progress  ("\n\t$zimlet");
			runAsZimbra ("/opt/zimbra/bin/zmzimletctl deploy zimlets-network/$zimletfile");
		}
		progress ( "\nDone\n" );
	}

	configLog("configInstallZimlets");
}

sub configCreateDomain {

	if ($configStatus{configCreateDomain} eq "CONFIGURED") {
		configLog("configCreateDomain");
		return 0;
	}

	if (!$ldapConfigured && isEnabled("zimbra-ldap")) {
		if ($config{DOCREATEDOMAIN} eq "yes") {
			progress ( "Creating domain $config{CREATEDOMAIN}..." );
			runAsZimbra("$ZMPROV cd $config{CREATEDOMAIN}");
			runAsZimbra("$ZMPROV mcf zimbraDefaultDomainName $config{CREATEDOMAIN}");
			progress ( "Done\n" );

		}
	}
	if (isEnabled("zimbra-store")) {
		if ($config{DOCREATEADMIN} eq "yes") {
			progress ( "Creating user $config{CREATEADMIN}..." );
			my ($u,$d) = split ('@', $config{CREATEADMIN});
			runAsZimbra("$ZMPROV cd $d");
			runAsZimbra("$ZMPROV ca ".
				"$config{CREATEADMIN} \'$config{CREATEADMINPASS}\' ".
				"zimbraIsAdminAccount TRUE");
			progress ( "Done\n" );
			progress ( "Creating postmaster alias..." );
			runAsZimbra("$ZMPROV aaa ".
				"$config{CREATEADMIN} root\@$config{CREATEDOMAIN}");
			runAsZimbra("$ZMPROV aaa ".
				"$config{CREATEADMIN} postmaster\@$config{CREATEDOMAIN}");
			runAsZimbra("$ZMPROV ca ".
				"$config{NOTEBOOKACCOUNT} \'$config{NOTEBOOKPASS}\' ".
				"amavisBypassSpamChecks TRUE ".
				"zimbraAttachmentsIndexingEnabled FALSE ".
        "zimbraIsSystemResource TRUE ".
				"zimbraHideInGal TRUE ".
				"zimbraMailQuota 0 ".
				"description \'Global Documents account\'");
			progress ( "Done\n" );
		}
		if ($config{DOTRAINSA} eq "yes") {
			progress ( "Creating user $config{TRAINSASPAM}..." );
			my $pass = genRandomPass();
			runAsZimbra("$ZMPROV ca ".
				"$config{TRAINSASPAM} \'$pass\' ".
				"amavisBypassSpamChecks TRUE ".
				"zimbraAttachmentsIndexingEnabled FALSE ".
        "zimbraIsSystemResource TRUE ".
				"zimbraHideInGal TRUE ".
				"zimbraMailQuota 0 ".
				"description \'Spam training account\'");
			progress ( "Done\n" );
			progress ( "Creating user $config{TRAINSAHAM}..." );
				runAsZimbra("$ZMPROV ca ".
				"$config{TRAINSAHAM} \'$pass\' ".
				"amavisBypassSpamChecks TRUE ".
				"zimbraAttachmentsIndexingEnabled FALSE ".
        "zimbraIsSystemResource TRUE ".
				"zimbraHideInGal TRUE ".
				"zimbraMailQuota 0 ".
				"description \'Spam training account\'");
			progress ( "Done\n" );
			progress ( "Setting spam training accounts..." );
			runAsZimbra("$ZMPROV mcf ".
				"zimbraSpamIsSpamAccount $config{TRAINSASPAM} ".
				"zimbraSpamIsNotSpamAccount $config{TRAINSAHAM}");
			progress ( "Done\n" );
		}
	}
	configLog("configCreateDomain");
}

sub configInitSql {

	if ($configStatus{configInitSql} eq "CONFIGURED") {
		configLog("configInitSql");
		return 0;
	}

	if (!$sqlConfigured && isEnabled("zimbra-store")) {
		progress ( "Initializing store sql database..." );
		runAsZimbra ("/opt/zimbra/libexec/zmmyinit");
		progress ( "Done\n" );
		progress ( "Setting zimbraSmtpHostname for $config{HOSTNAME}..." );
		runAsZimbra("$ZMPROV ms $config{HOSTNAME} ".
			"zimbraSmtpHostname $config{SMTPHOST}");
		progress ( "Done\n" );
	}
	configLog("configInitSql");
}

sub configInitLogger {

	if ($configStatus{configInitLogger} eq "CONFIGURED") {
		configLog("configInitLogger");
		return 0;
	}

	if (!$loggerSqlConfigured && isEnabled("zimbra-logger")) {
		progress ( "Initializing logger sql database..." );
		runAsZimbra ("/opt/zimbra/libexec/zmloggerinit");
		progress ( "Done\n" );
	} 

	if (isEnabled("zimbra-logger")) {
		runAsZimbra ("$ZMPROV mcf zimbraLogHostname $config{HOSTNAME}");
	}
	configLog("configInitLogger");
}

sub configInitMta {

	if ($configStatus{configInitMta} eq "CONFIGURED") {
		configLog("configInitMta");
		return 0;
	}

	if (isEnabled("zimbra-mta")) {
		progress ( "Initializing mta config..." );
		runAsZimbra ("/opt/zimbra/libexec/zmmtainit $config{LDAPHOST}");
		progress ( "Done\n" );
		$installedServiceStr .= "zimbraServiceInstalled antivirus ";
		$installedServiceStr .= "zimbraServiceInstalled antispam ";
		if ($config{RUNAV} eq "yes") {
			$enabledServiceStr .= "zimbraServiceEnabled antivirus ";
		}
		if ($config{RUNSA} eq "yes") {
			$enabledServiceStr .= "zimbraServiceEnabled antispam ";
		}
	}
	configLog("configInitMta");
}

sub configInitSnmp {

	if ($configStatus{configInitSnmp} eq "CONFIGURED") {
		configLog("configInitSnmp");
		return 0;
	}

	if (isEnabled("zimbra-snmp")) {
		progress ( "Configuring SNMP..." );
		setLocalConfig ("snmp_notify", $config{SNMPNOTIFY});
		setLocalConfig ("smtp_notify", $config{SMTPNOTIFY});
		setLocalConfig ("snmp_trap_host", $config{SNMPTRAPHOST});
		setLocalConfig ("smtp_source", $config{SMTPSOURCE});
		setLocalConfig ("smtp_destination", $config{SMTPDEST});
		runAsZimbra ("/opt/zimbra/libexec/zmsnmpinit");
		progress ( "Done\n" );
	}
	configLog("configInitSnmp");
}

sub configInitNotebooks {

	configLog("configInitNotebooks");
	if (isEnabled("zimbra-store")) {
		progress ( "Initializing Documents..." );
    my ($notebookUser, $notebookDomain, $globalWikiAcct);
    my $rc = 0;

    $globalWikiAcct = getLdapConfigValue("zimbraNotebookAccount");

    # enable wiki before we do anything else.
		runAsZimbra("/opt/zimbra/bin/zmprov mc default zimbraFeatureNotebookEnabled TRUE");

    if ($globalWikiAcct eq "") {
      if ($config{NOTEBOOKACCOUNT} eq "") {
        open DOMAINS, "$ZMPROV gad|" or die "Can't get domain list!";
        my $domain = <DOMAINS>;
        close DOMAINS;
        chomp $domain;
        open RP, "/opt/zimbra/bin/zmjava com.zimbra.cs.util.RandomPassword 8 10|" 
          or die "Can't generate random account name: $!\n";
        chomp(my $nbacct = <RP>);
        close RP;
        $config{NOTEBOOKACCOUNT} = "$nbacct\@$domain";
  
        open RP, "/opt/zimbra/bin/zmjava com.zimbra.cs.util.RandomPassword 8 10|" 
          or die "Can't generate random account name: $!\n";
        chomp($config{NOTEBOOKPASS} = <RP>);
        close RP;
      }

    # global Documents
		  runAsZimbra("/opt/zimbra/bin/zmprov mcf zimbraNotebookAccount $config{NOTEBOOKACCOUNT}");
		  $rc = runAsZimbra("/opt/zimbra/bin/zmprov in $config{NOTEBOOKACCOUNT} \'$config{NOTEBOOKPASS}\' /opt/zimbra/wiki/Template Template");
    } 

#	  ($notebookUser, $notebookDomain) = split ('@', $config{NOTEBOOKACCOUNT});

#    # domain Documents only if the domain is local and wiki account
#    # was not previously setup.
#    open(ZM, "$ZMPROV gad|") or warn "Can't get domain list!";
#    my @domains = <ZM>;
#    close(ZM);
#    foreach my $domain (@domains) {
#      chomp($domain);
#      my $domainType = (split(/\s+/, `su - zimbra -c "$ZMPROV gd $domain | grep zimbraDomainType"`))[-1];
#      next unless $domainType eq "local";
#
#      my $domainWikiAcct = (split(/\s+/, `su - zimbra -c "$ZMPROV gd $domain | grep zimbraNotebookAccount"`))[-1];
##      next unless $domainWikiAcct eq "";
#
#      $notebookUser = "domainWiki" unless $notebookUser; 
#      my $nbacc = "$notebookUser\@$domain";
#
#      # global and domain accounts cannot be the same
#      $nbacc = "domainWiki\@$domain" 
#        if ($nbacc eq "$config{NOTEBOOKACCOUNT}");
#
#      runAsZimbra("/opt/zimbra/bin/zmprov idn $nbacc \'$config{NOTEBOOKPASS}\' $domain /opt/zimbra/wiki/Template Template");
#    }
    if ($rc != 0) {
      progress ("failed to initialize documents...see logfile for details.\n");
	    runAsZimbra("$ZMPROV mc default zimbraFeatureNotebookEnabled FALSE")
    } else {
      runAsZimbra("/opt/zimbra/bin/tomcat restart");
		  progress ( "Done\n" );
    }
	}
    
	configLog("configInitNotebooks");
}

sub configSetEnabledServices {

	if ($configStatus{configSetEnabledServices} eq "CONFIGURED") {
		configLog("configSetEnabledServices");
		return 0;
	}

	foreach my $p (keys %installedPackages) {
		if ($p eq "zimbra-core") {next;}
		if ($p eq "zimbra-apache") {next;}
		$p =~ s/zimbra-//;
		if ($p eq "store") {$p = "mailbox"; $installedServiceStr .= "zimbraServiceInstalled imapproxy ";}
		$installedServiceStr .= "zimbraServiceInstalled $p ";
	}

	foreach my $p (keys %enabledPackages) {
		if ($p eq "zimbra-core") {next;}
		if ($p eq "zimbra-apache") {next;}
		if ($enabledPackages{$p} eq "Enabled") {
			$p =~ s/zimbra-//;
			if ($p eq "store") {$p = "mailbox";}
			$enabledServiceStr .= "zimbraServiceEnabled $p ";
		}
	}
	if ($config{USEIMAPPROXY} eq "yes") {
		$enabledServiceStr .= "zimbraServiceEnabled imapproxy ";
	}

	progress ( "Setting services on $config{HOSTNAME}..." );
	runAsZimbra ("$ZMPROV ms $config{HOSTNAME} $installedServiceStr");
	runAsZimbra ("$ZMPROV ms $config{HOSTNAME} $enabledServiceStr");
	progress ( "Done\n" );

	configLog("configSetEnabledServices");
}

sub failConfig {
	progress ("\n\nERROR\n\n");
	progress ("\n\nConfiguration failed\n\n");
	progress ("Please address the error and re-run /opt/zimbra/libexec/zmsetup.pl to\n");
	progress ("complete the configuration");
	exit 1;
}

sub applyConfig {
	if (!(defined ($options{c})) && $newinstall ) {
		if (askYN("Save configuration data to a file?", "Yes") eq "yes") {
			saveConfig();
		}
		if (askYN("The system will be modified - continue?", "No") eq "no") {
			return 1;
		}
	} else {
		saveConfig();
	}
	progress ( "Operations logged to $logfile\n" );

	open (H, ">>/opt/zimbra/.install_history");

	print H time(),": CONFIG SESSION START\n";
	# This is the postinstall config

	configLog ("BEGIN");

	configLCValues();

	# About SSL
	# 
	# On the master ldap server, create a ca and a ceert
	# On store and MTA servers, just create a cert.
	#
	# Non-ldap masters use the master CA, which they get from ldap
	# but ldap won't start without a cert.
	#
	# so - ldap - create CA, create cert, init ldap, store CA in ldap
	#
	# non-ldap - fetch CA, create cert

	configCASetup();

	configCreateCert();

	configSetupLdap();

	configSaveCA();

	configInstallCert();

	configCreateServerEntry();

	if (isEnabled("zimbra-store")) {
		configSpellServer();

		configSetServicePorts();

		addServerToHostPool();

		configInstallZimlets();

		configSetInstalledSkins();

	}

	if (isEnabled("zimbra-mta")) {
		configSetMtaAuthHost();
	}

	configCreateDomain();

	configInitSql();

	configInitLogger();

	configInitMta();

	configInitSnmp();

	configSetEnabledServices();

	setupCrontab();

  setupSyslog();

	postinstall::configure();

	`touch /opt/zimbra/.bash_history`;
	`chown zimbra:zimbra /opt/zimbra/.bash_history`;

	if ($config{STARTSERVERS} eq "yes") {

    # bug 6270 
    if ($platform =~ m/DEBIAN/ && ! $newinstall) {
      `chown zimbra:zimbra /opt/zimbra/redolog/redo.log`;
    }

		progress ( "Starting servers..." );
		runAsZimbra ("/opt/zimbra/bin/zmcontrol start");
		# runAsZimbra swallows the output, so call status this way
		`su - zimbra -c "/opt/zimbra/bin/zmcontrol status"`;
		progress ( "Done.\n" );

    # Initialize notebooks if zimbra-store is enabled and 
    # only after the application server is running.
    configInitNotebooks()
	    if (isEnabled("zimbra-store"));

	} else {
    progress ( "Skipping notebook initialization.\n")
	    if (isEnabled("zimbra-store"));
  }

	if ($newinstall) {
		runAsZimbra ("/opt/zimbra/bin/zmsshkeygen");
		runAsZimbra ("/opt/zimbra/bin/zmupdateauthkeys");
	} else {
		runAsZimbra ("/opt/zimbra/bin/zmupdateauthkeys");
	}
	if ($platform =~ /MACOSX/) {
		if (-d "/System/Library/LaunchDaemons") {
			`cp -f /opt/zimbra/conf/com.zimbra.zcs.plist /System/Library/LaunchDaemons`;
			`launchctl load /System/Library/LaunchDaemons/com.zimbra.zcs.plist`;
		}
	}

	configLog ("END");

	print H time(),": CONFIG SESSION COMPLETE\n";

	close H;

	getSystemStatus();

	progress ( "\n\n" );
	progress ( "Operations logged to $logfile\n" );
	progress ( "\n\n" );
	if (!defined ($options{c})) {
		ask("Configuration complete - press return to exit", "");
		print "\n\n";
		exit 0;
	}
}

sub configLog {
	my $stage = shift;
	my $msg = time().": CONFIGURED $stage\n";
	print H $msg;
	#progress ($msg);
}

sub setupSyslog {

	progress ("Setting up syslog.conf...");
	if ( -f "/opt/zimbra/bin/zmsyslogsetup") {
	  my $rc = 0xffff & system("/opt/zimbra/bin/zmsyslogsetup local");
	  if ($rc) {
	    progress ("Failed\n");
	    } else {
	    progress ("Done\n");
    }
	} else {
    progress ("Failed\n");
  }
	configLog("setupSyslog");
}
sub setupCrontab {

	my $backupSchedule;
	progress ("Setting up zimbra crontab...");
	if ( -f "/opt/zimbra/bin/zmschedulebackup") {
		$backupSchedule = `su - zimbra -c "zmschedulebackup -s"`;
		chomp $backupSchedule;
	}
	if ($platform =~ /SUSE/i) {
		`cp -f /var/spool/cron/tabs/zimbra /tmp/crontab.zimbra.orig`;
	} else {
		`crontab -u zimbra -l > /tmp/crontab.zimbra.orig`;
	}
	my $rc = 0xffff & system("grep ZIMBRASTART /tmp/crontab.zimbra.orig > /dev/null 2>&1");
	if ($rc) {
		`cat /dev/null > /tmp/crontab.zimbra.orig`;
	}
	$rc = 0xffff & system("grep ZIMBRAEND /tmp/crontab.zimbra.orig > /dev/null 2>&1");
	if ($rc) {
		`cat /dev/null > /tmp/crontab.zimbra.orig`;
	}
	`cat /tmp/crontab.zimbra.orig | sed -e '/# ZIMBRASTART/,/# ZIMBRAEND/d' > /tmp/crontab.zimbra.proc`;
	`cp -f /opt/zimbra/zimbramon/crontabs/crontab /tmp/crontab.zimbra`;

	if (isEnabled("zimbra-ldap")) {
		`cat /opt/zimbra/zimbramon/crontabs/crontab.ldap >> /tmp/crontab.zimbra`;
	}

	if (isEnabled("zimbra-store")) {
		`cat /opt/zimbra/zimbramon/crontabs/crontab.store >> /tmp/crontab.zimbra`;
	}

	if (isEnabled("zimbra-logger")) {
		`cat /opt/zimbra/zimbramon/crontabs/crontab.logger >> /tmp/crontab.zimbra`;
	}

	if (isEnabled("zimbra-mta")) {
		`cat /opt/zimbra/zimbramon/crontabs/crontab.mta >> /tmp/crontab.zimbra`;
	}

	`echo "# ZIMBRAEND -- DO NOT EDIT ANYTHING BETWEEN THIS LINE AND ZIMBRASTART" >> /tmp/crontab.zimbra`;
	`cat /tmp/crontab.zimbra.proc >> /tmp/crontab.zimbra`;

	`crontab -u zimbra /tmp/crontab.zimbra`;
	if ( -f "/opt/zimbra/bin/zmschedulebackup" && $backupSchedule ne "") {
		$backupSchedule =~ s/"/\\"/g;
		`su - zimbra -c "/opt/zimbra/bin/zmschedulebackup -R $backupSchedule" > /dev/null 2>&1`;
	}
	progress ("Done\n");
	configLog("setupCrontab");

}


sub addServerToHostPool {
	progress ( "Adding $config{HOSTNAME} to zimbraMailHostPool in default COS..." );
	my $id = `$ZMPROV gs $config{HOSTNAME} | grep zimbraId | sed -e 's/zimbraId: //'`;
	chomp $id;

	my $hp = `$ZMPROV gc default | grep zimbraMailHostPool | sed 's/zimbraMailHostPool: //'`;
	chomp $hp;

	my @HP = split (' ', $hp);

	my $n = "";

	foreach (@HP) {
		chomp;
		$n .= "zimbraMailHostPool $_ ";
	}

	$n .= "zimbraMailHostPool $id";

	`$ZMPROV mc default $n >> $logfile 2>&1`;
	progress ( "Done\n" );
}

sub mainMenu {
	my %mm = ();
	$mm{createsub} = \&createMainMenu;

	displayMenu(\%mm);
}

sub startLdap {
	progress ( "Starting ldap..." );
	runAsZimbra 
		("/opt/zimbra/openldap/sbin/slapindex -f /opt/zimbra/conf/slapd.conf");
	runAsZimbra ("/opt/zimbra/bin/ldap start");
	runAsZimbra ("/opt/zimbra/libexec/zmldapapplyldif");
	progress ( "Done\n" );
}

sub resumeConfiguration {
	progress ( "\n\nNote\n\n" );
	progress ( "The previous configuration appears to have failed to complete\n\n");
	if (askYN ("Attempt to complete configuration now?", "yes") eq "yes") {
		applyConfig();
	} else {
		%configStatus = ();
	}
}

getInstalledPackages();

setDefaults();

# if we're an upgrade, run the upgrader...

if (! $newinstall && ($prevVersion ne $curVersion )) {
	progress ("Upgrading from $prevVersion to $curVersion\n");
	if (zmupgrade::upgrade($prevVersion, $curVersion)){
		progress ("UPGRADE FAILED - exiting\n");
		exit 1;
	} else {
		progress ("Upgrade complete\n");
	}
}

setEnabledDependencies();

checkPortConflicts();

getSystemStatus();

if ($ldapConfigured) {
	startLdap();
}

if ($ldapConfigured || 
	(($config{LDAPHOST} ne $config{HOSTNAME}) && !verifyLdap())) {
	setLdapDefaults();
  
}

if ($options{c}) {
	loadConfig ($options{c});
	applyConfig();
} else {
	if ($configStatus{BEGIN} eq "CONFIGURED" &&
		$configStatus{END}  ne "CONFIGURED") {
		resumeConfiguration();
	}
	if (!$newinstall) {
		my $m = createMainMenu();
		if (checkMenuConfig($m)) {
			applyConfig();
		}
	} 
	mainMenu();
}

close LOGFILE;
chmod 0600, $logfile;

__END__
