#!/bin/bash -x

#
# Builds a saslauthd with Zimbra authentication support.  We modify
# configure.in which means we have to run autoconf.  I have borrowed
# the steps to run autoconf from the rpm spec.  The cyrus CVS tree's
# SMakefile is probably the source for the rpm spec.
#
release=cyrus-sasl-2.1.22
patchlevel=3
src=${release}.${patchlevel}
platform=`uname -s`

cyrus_root=`pwd`
p4_root=`cd ${cyrus_root}/../..; pwd`
build_platform=`sh ${p4_root}/ZimbraBuild/rpmconf/Build/get_plat_tag.sh`

openssl_lib_dir=/opt/zimbra/openssl-0.9.8e/lib
heimdal_lib_dir=/opt/zimbra/heimdal-1.0.1/lib
sleepycat_lib_dir=/opt/zimbra/sleepycat-4.2.52.6/lib
cyrus_lib_dir=/opt/zimbra/cyrus-sasl-2.1.22.3/lib

rm -fr build
mkdir build
cd build
tar xfz ../cyrus-sasl-2.1.22.tar.gz  -C .
chmod -R +w ${release}
mv ${release} ${src}

cd ${src}
patch -g0 -p1 < ../../sasl-link-order.patch
patch -g0 -p1 < ../../sasl-darwin.patch
patch -g0 -p1 < ../../sasl-auth-zimbra.patch
rm config/ltconfig config/libtool.m4
if [ -x /usr/bin/libtoolize ]; then
	LIBTOOLIZE=/usr/bin/libtoolize
else
	if [ -x /opt/local/bin/glibtoolize ]; then
		export CPPFLAGS=-DDARWIN
		LIBTOOLIZE=/opt/local/bin/glibtoolize
	else
		echo "Where is libtoolize?"
		exit 1
	fi
fi
$LIBTOOLIZE -f -c
aclocal -I config -I cmulocal
automake -a -c -f
autoheader
autoconf -f

cd saslauthd
rm config/ltconfig
$LIBTOOLIZE -f -c
aclocal -I config -I ../cmulocal -I ../config
automake -a -c -f
autoheader
autoconf -f

cd ..
# fix 64-bit linking against OpenSSL
if [ $build_platform = "RHEL4_64" -o $build_platform = "RHEL5_64" -o $build_platform = "SLES10_64" ]; then
   sed -i.obak -e 's|${with_openssl}/$CMU_LIB_SUBDIR|${with_openssl}/lib|' -e 's|${with_openssl}/lib $andrew_runpath_switch${with_openssl}/$CMU_LIB_SUBDIR|${with_openssl}/lib|' configure
   sed -i.obak -e 's|${with_openssl}/$CMU_LIB_SUBDIR|${with_openssl}/lib|' -e 's|${with_openssl}/lib $andrew_runpath_switch${with_openssl}/$CMU_LIB_SUBDIR|${with_openssl}/lib|' saslauthd/configure
fi

sed -i.bak 's/-lRSAglue //' configure
if [ $platform = "Darwin" ]; then
# we need to remove all -lxml2 references because mac ld will pick the dylib
# no matter the order of -L options.
sed -i .bak -e 's/-lxml2//g' /opt/zimbra/libxml2/bin/xml2-config
LD_RUN_PATH="${openssl_lib_dir}:${heimdal_lib_dir}:${sleepycat_lib_dir}:${cyrus_lib_dir}" LIBS="/opt/zimbra/libxml2/lib/libxml2.a" CFLAGS="-D_REENTRANT -g -O2 -I/opt/zimbra/libxml2/include/libxml2" ./configure --enable-zimbra --prefix=/opt/zimbra/${src} \
            --with-saslauthd=/opt/zimbra/${src}/state \
            --with-plugindir=/opt/zimbra/${src}/lib/sasl2 \
            --enable-static=no \
            --enable-shared \
            --with-dblib=no \
            --with-openssl=/opt/zimbra/openssl \
            --with-gss_impl=heimdal \
            --enable-gssapi=/opt/zimbra/heimdal \
            --enable-login
else 
LD_RUN_PATH="${openssl_lib_dir}:${heimdal_lib_dir}:${sleepycat_lib_dir}:${cyrus_lib_dir}" LIBS="/opt/zimbra/libxml2/lib/libxml2.a" CFLAGS="-D_REENTRANT -g -O2" ./configure --enable-zimbra --prefix=/opt/zimbra/${src} \
            --with-saslauthd=/opt/zimbra/${src}/state \
            --with-plugindir=/opt/zimbra/${src}/lib/sasl2 \
            --with-dblib=no \
            --with-openssl=/opt/zimbra/openssl \
            --with-gss_impl=heimdal \
            --enable-gssapi=/opt/zimbra/heimdal \
            --enable-login
fi
if [ $platform = "Darwin" ]; then
     sed -i .bak -e 's/\_la_LDFLAGS)/_la_LDFLAGS) $(AM_LDFLAGS)/' plugins/Makefile
elif [ $build_platform = "F7" -o $build_platform -o "DEBIAN4.0" ]; then
     sed -i.bak -e 's/\_la_LDFLAGS)/_la_LDFLAGS) $(AM_LDFLAGS)/' plugins/Makefile
fi
env LD_RUN_PATH="${openssl_lib_dir}:${heimdal_lib_dir}:${sleepycat_lib_dir}:${cyrus_lib_dir}" make
