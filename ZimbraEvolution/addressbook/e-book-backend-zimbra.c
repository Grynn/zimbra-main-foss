/* -*- Mode: C; tab-width: 4; indent-tabs-mode: t; c-basic-offset: 8 -*- */

/* e-book-backend-zimbra.c - Zimbra contact backend.
 *
 * Copyright (C) 2006 Zimbra, Inc.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of version 2 of the GNU Lesser General Public
 * License as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the
 * Free Software Foundation, Inc., 59 Temple Place - Suite 330,
 * Boston, MA 02111-1307, USA.
 *
 * Authors: Scott Herscher <scott.herscher@zimbra.com>
 */

#include <config.h>

#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

#include <glib.h>
#include <glib/gstdio.h>
#include <glib/gi18n-lib.h>

#include <libedataserver/e-sexp.h>
#include <libedataserver/e-url.h>
#include <libebook/e-contact.h>
#include <libedata-book/e-book-backend-sexp.h>
#include <libedata-book/e-data-book.h>
#include <libedata-book/e-data-book-view.h>
#include <libedata-book/e-book-backend-cache.h>
#include <libedata-book/e-book-backend-summary.h>

#include <libezimbra/e-zimbra-connection.h>
#include <libezimbra/e-zimbra-item.h>
#include <libezimbra/e-zimbra-debug.h>
#include <libezimbra/e-zimbra-utils.h>

#include "e-book-backend-zimbra.h"


static EZimbraConnectionStatus
sync_changes
	(
	gpointer				handle,
	const char			*	name,
	GList				*	updates,
	GList				*	deletes
	);


static gboolean
send_update
	(
	EBookBackendZimbra	*	ebz,
	EDataBookView		*	book_view,
	EContact			*	contact
	);


static gboolean
send_remove
	(
	EBookBackendZimbra	*	ebz,
	const char			*	id
	);

static void
Log( const char * format, ... )
{
    char buffer[ 512 ];
    va_list ptr;

    va_start( ptr, format );
    vsnprintf( buffer, 512, format, ptr );
    va_end( ptr );

    fprintf( stderr, "(0x%x) %s", ( int ) g_thread_self(), buffer );
	fflush( stderr );
}


static EBookBackendClass *e_book_backend_zimbra_parent_class;
                                                                                                                             

struct _EBookBackendZimbraPrivate
{
	EZimbraConnection *cnc; 
	char *uri;
	char * username;
	char * password;
	char *folder_id;
	char *book_name;
	char *original_uri;
	char *summary_file_name;
	gboolean only_if_exists;
	GHashTable *categories_by_id;
	GHashTable *categories_by_name;
	gboolean is_writable;
	gboolean is_cache_ready;
	gboolean is_summary_ready;
	gboolean marked_for_offline;
	char *use_ssl;
	int mode;
	int cache_timeout;
	EBookBackendCache *cache;
	EBookBackendSummary *summary;
	GMutex *update_mutex;
	/* for future use */
	void *reserved1;
	void *reserved2;
	void *reserved3;
};


#define ELEMENT_TYPE_SIMPLE		0x01
#define ELEMENT_TYPE_COMPLEX	0x02 /* fields which require explicit functions to set values into EContact and EZimbraItem */
#define SUMMARY_FLUSH_TIMEOUT	5000


gboolean  enable_debug = TRUE;

static void populate_emails (EContact *contact, gpointer data);
static void set_emails_in_zimbra_item (EZimbraItem *item, gpointer data);
static void set_emails_changes (EZimbraItem *new_item, EZimbraItem *old_item);
static void populate_full_name (EContact *contact, gpointer data);
static void set_full_name_in_zimbra_item (EZimbraItem *item, gpointer data);
static void set_full_name_changes (EZimbraItem *new_item, EZimbraItem *old_item);
static void populate_contact_members (EContact *contact, gpointer data);
static void populate_birth_date (EContact *contact, gpointer data);
static void set_birth_date_in_zimbra_item (EZimbraItem *item, gpointer data);
static void set_birth_date_changes  (EZimbraItem *new_item, EZimbraItem *old_item);
static void populate_address (EContact *contact, gpointer data);
static void set_address_in_zimbra_item (EZimbraItem *item, gpointer data);
static void set_address_changes (EZimbraItem *new_item, EZimbraItem *old_item);

static void fill_contact_from_zimbra_item (EContact *contact, EZimbraItem *item, GHashTable *categories_by_ids);

struct field_element_mapping
{
	EContactField	field_id;
  	int				element_type;
	char		*	element_name;

	void			(*populate_contact_func)
						(
						EContact *contact,
						gpointer data
						);

	void			(*set_value_in_zimbra_item)
						(
						EZimbraItem *item,
						gpointer data	
						);

	void			(*set_changes)
						(
						EZimbraItem *new_item,
						EZimbraItem *old_item
						);
};


static struct field_element_mapping g_mappings[] =
{
	// 1
	{
		E_CONTACT_UID,
		ELEMENT_TYPE_SIMPLE,
		"id",
		NULL,
		NULL,
		NULL
	},
	// 2
	{
		E_CONTACT_FILE_AS,
		ELEMENT_TYPE_SIMPLE,
		"name",
		NULL,
		NULL,
		NULL
	},
	// 4
	{
		E_CONTACT_FULL_NAME,
		ELEMENT_TYPE_COMPLEX,
		"full_name",
		populate_full_name,
		set_full_name_in_zimbra_item,
		set_full_name_changes
	},
	// 107
	{
		E_CONTACT_BIRTH_DATE,
		ELEMENT_TYPE_COMPLEX,
		"birthday",
		populate_birth_date,
		set_birth_date_in_zimbra_item,
		set_birth_date_changes
	},
	// 42
	{
		E_CONTACT_HOMEPAGE_URL,
		ELEMENT_TYPE_SIMPLE,
		"website",
		NULL,
		NULL,
		NULL
	},
	// 50
	{
		E_CONTACT_NOTE,
		ELEMENT_TYPE_SIMPLE,
		"notes",
		NULL,
		NULL,
		NULL
	},
	// 31
	{
		E_CONTACT_PHONE_PRIMARY,
		ELEMENT_TYPE_SIMPLE,
		"default_phone",
		NULL,
		NULL,
		NULL
	},
	// 23
	{
		E_CONTACT_PHONE_HOME,
		ELEMENT_TYPE_SIMPLE,
		"homePhone",
		NULL,
		NULL,
		NULL
	},
	// 24
	{
		E_CONTACT_PHONE_HOME_2,
		ELEMENT_TYPE_SIMPLE,
		"homePhone2",
		NULL,
		NULL,
		NULL
	},
	// 17
	{
		E_CONTACT_PHONE_BUSINESS,
		ELEMENT_TYPE_SIMPLE,
		"workPhone",
		NULL,
		NULL,
		NULL
	},
	// 28
	{
		E_CONTACT_PHONE_OTHER,
		ELEMENT_TYPE_SIMPLE,
		"otherPhone",
		NULL,
		NULL,
		NULL
	},
	// 27
	{
		E_CONTACT_PHONE_MOBILE,
		ELEMENT_TYPE_SIMPLE,
		"mobilePhone",
		NULL,
		NULL,
		NULL
	},
	// 21
	{
		E_CONTACT_PHONE_CAR,
		ELEMENT_TYPE_SIMPLE,
		"carPhone",
		NULL,
		NULL,
		NULL
	},
	// 22
	{
		E_CONTACT_PHONE_COMPANY,
		ELEMENT_TYPE_SIMPLE,
		"companyPhone",
		NULL,
		NULL,
		NULL
	},
	// 16
	{
		E_CONTACT_PHONE_ASSISTANT,
		ELEMENT_TYPE_SIMPLE,
		"assistantPhone",
		NULL,
		NULL,
		NULL
	},
	// 20
	{
		E_CONTACT_PHONE_CALLBACK,
		ELEMENT_TYPE_SIMPLE,
		"callbackPhone",
		NULL,
		NULL,
		NULL
	},
	// 25
	{
		E_CONTACT_PHONE_HOME_FAX,
		ELEMENT_TYPE_SIMPLE,
		"homeFax",
		NULL,
		NULL,
		NULL
	},
	// 19
	{
		E_CONTACT_PHONE_BUSINESS_FAX,
		ELEMENT_TYPE_SIMPLE,
		"workFax",
		NULL,
		NULL,
		NULL
	},
	// 29
	{
		E_CONTACT_PHONE_OTHER_FAX,
		ELEMENT_TYPE_SIMPLE,
		"otherFax",
		NULL,
		NULL,
		NULL
	},
	// 30
	{
		E_CONTACT_PHONE_PAGER,
		ELEMENT_TYPE_SIMPLE,
		"pager",
		NULL,
		NULL,
		NULL
	},
	// 35
	{
		E_CONTACT_ORG,
		ELEMENT_TYPE_SIMPLE,
		"company",
		NULL,
		NULL,
		NULL
	},
	// 36
	{
		E_CONTACT_ORG_UNIT,
		ELEMENT_TYPE_SIMPLE,
		"department",
		NULL,
		NULL,
		NULL
	},
	// 38
	{
		E_CONTACT_TITLE,
		ELEMENT_TYPE_SIMPLE,
		"jobTitle",
		NULL,
		NULL,
		NULL
	},
	// 97
	{
		E_CONTACT_EMAIL,
		ELEMENT_TYPE_COMPLEX,
		"members",
		populate_contact_members,
		NULL,
		NULL
	},
	// 90
	{
		E_CONTACT_ADDRESS_HOME,
		ELEMENT_TYPE_COMPLEX,
		"Home",
		populate_address,
		set_address_in_zimbra_item,
		set_address_changes
	},
	{
		E_CONTACT_ADDRESS_WORK,
		ELEMENT_TYPE_COMPLEX,
		"Work",
		populate_address,
		set_address_in_zimbra_item,
		set_address_changes
	},
	{
		E_CONTACT_ADDRESS_OTHER,
		ELEMENT_TYPE_COMPLEX,
		"Other",
		populate_address,
		set_address_in_zimbra_item,
		set_address_changes
	},
	// 8
	{
		E_CONTACT_EMAIL_1,
		ELEMENT_TYPE_COMPLEX,
		"email",
		populate_emails,
		set_emails_in_zimbra_item,
		set_emails_changes
	},
	// 87
	{
		E_CONTACT_REV,
		ELEMENT_TYPE_SIMPLE,
		"modified_time",
		NULL,
		NULL,
		NULL
	},
	// 3
	{
		E_CONTACT_BOOK_URI,
		ELEMENT_TYPE_SIMPLE,
		"book_uri",
		NULL,
		NULL,
		NULL
	},
	{
		E_CONTACT_NOTE,
		ELEMENT_TYPE_SIMPLE,
		"notes",
		NULL,
		NULL,
		NULL
	}
}; 


static int g_num_mappings = sizeof( g_mappings ) / sizeof( g_mappings[0] );


typedef struct
{
	EBookBackendZimbra *bg;
	GMutex *mutex;
	GCond *cond;
	GThread *thread;
	gboolean stopped;
} ZimbraBackendSearchClosure;


static ZimbraBackendSearchClosure*
get_closure (EDataBookView *book_view)
{
	return g_object_get_data( G_OBJECT( book_view ), "EBookBackendZimbra.BookView::closure");
}


static EDataBookView *
find_book_view (EBookBackendZimbra *ebz)
{
	EList *views = e_book_backend_get_book_views (E_BOOK_BACKEND (ebz));
	if (!views)
		return NULL;
	EIterator *iter = e_list_get_iterator (views);
	EDataBookView *rv = NULL;

	if (e_iterator_is_valid (iter)) {
		/* just always use the first book view */
		EDataBookView *v = (EDataBookView*)e_iterator_get(iter);
		if (v)
			rv = v;
	}

	g_object_unref (iter);
	g_object_unref (views);
	
	return rv;
}


static void 
copy_postal_address_to_contact_address ( EContactAddress *contact_addr, PostalAddress *address)
{
	contact_addr->address_format = NULL;
	contact_addr->po = NULL;
	contact_addr->street = g_strdup (address->street_address);
	contact_addr->ext = g_strdup (address->location);
	contact_addr->locality = g_strdup (address->city);
	contact_addr->region = g_strdup (address->state);
	contact_addr->code = g_strdup (address->postal_code);
	contact_addr->country = g_strdup (address->country);
}

static void 
copy_contact_address_to_postal_address (PostalAddress *address, EContactAddress *contact_addr)
{
	/* ugh, contact addr has null terminated strings instead of NULLs*/
	address->street_address = (contact_addr->street && *contact_addr->street) ? g_strdup (contact_addr->street): NULL;
	address->location = (contact_addr->ext && *contact_addr->ext) ? g_strdup (contact_addr->ext) : NULL;
	address->city = (contact_addr->locality && *contact_addr->locality) ? g_strdup (contact_addr->locality) : NULL;
	address->state = (contact_addr->region && *contact_addr->region) ?  g_strdup (contact_addr->region) : NULL;
	address->postal_code = (contact_addr->code && *contact_addr->code ) ? g_strdup (contact_addr->code) : NULL;
	address->country = (contact_addr->country && *(contact_addr->country)) ? g_strdup (contact_addr->country) : NULL;
}


static void 
populate_address (EContact *contact, gpointer data)
{
	PostalAddress *address;
	EZimbraItem *item;
	EContactAddress *contact_addr;
	
	item = E_ZIMBRA_ITEM (data);
	
	contact_addr = NULL;

	if ( ( address = e_zimbra_item_get_address( item, "home" ) ) != NULL )
	{
		contact_addr = g_new0(EContactAddress, 1);
		copy_postal_address_to_contact_address (contact_addr, address);
		e_contact_set (contact, E_CONTACT_ADDRESS_HOME, contact_addr);
		e_contact_address_free (contact_addr);
	}
  
	if ( ( address = e_zimbra_item_get_address (item, "work") ) != NULL )
	{
		contact_addr = g_new0(EContactAddress, 1);
		copy_postal_address_to_contact_address (contact_addr, address);
		e_contact_set (contact, E_CONTACT_ADDRESS_WORK, contact_addr);
		e_contact_address_free (contact_addr);
	}

	if ( ( address = e_zimbra_item_get_address (item, "other") ) != NULL )
	{
		contact_addr = g_new0(EContactAddress, 1);
		copy_postal_address_to_contact_address (contact_addr, address);
		e_contact_set (contact, E_CONTACT_ADDRESS_OTHER, contact_addr);
		e_contact_address_free (contact_addr);
	}
}

static void 
set_address_in_zimbra_item
	(
	EZimbraItem	*	item,
	gpointer		data
	)
{
	EContact		*	contact;
	EContactAddress *	contact_address;
	PostalAddress	*	address;

	contact = E_CONTACT( data );
	
	if ( ( contact_address = e_contact_get( contact, E_CONTACT_ADDRESS_HOME ) ) != NULL )
	{
		address = g_new0( PostalAddress, 1 );
		copy_contact_address_to_postal_address(address, contact_address );
		e_zimbra_item_set_address( item, "home", address );
		e_contact_address_free (contact_address);
	}
		
	if ( ( contact_address = e_contact_get( contact, E_CONTACT_ADDRESS_WORK ) ) != NULL )
	{
		address = g_new0(PostalAddress, 1);
		copy_contact_address_to_postal_address (address, contact_address);
		e_zimbra_item_set_address (item, "work", address);
		e_contact_address_free (contact_address);
	}

	if ( ( contact_address = e_contact_get( contact, E_CONTACT_ADDRESS_OTHER ) ) != NULL )
	{
		address = g_new0(PostalAddress, 1);
		copy_contact_address_to_postal_address (address, contact_address);
		e_zimbra_item_set_address (item, "other", address);
		e_contact_address_free (contact_address);
	}
}


static PostalAddress *
copy_postal_address (PostalAddress *address)
{
	PostalAddress *address_copy;

	address_copy = g_new0(PostalAddress, 1);

	address_copy->street_address = g_strdup (address->street_address);
	address_copy->location = g_strdup (address->location);
	address_copy->city = g_strdup (address->city);
	address_copy->state = g_strdup (address->state);
	address_copy->postal_code = g_strdup (address->postal_code);
	address_copy->country = g_strdup (address->country);
	return address_copy;
}

static void 
set_postal_address_change (EZimbraItem *new_item, EZimbraItem *old_item,  char *address_type)
{
	PostalAddress *old_postal_address;
	PostalAddress *new_postal_address;
	PostalAddress *update_postal_address, *delete_postal_address;
	char *s1, *s2;
	update_postal_address = g_new0(PostalAddress, 1);
	delete_postal_address = g_new0 (PostalAddress, 1);
	
	new_postal_address = e_zimbra_item_get_address (new_item,  address_type);
	old_postal_address = e_zimbra_item_get_address (old_item, address_type);
    	if (new_postal_address && old_postal_address) {
		s1 = new_postal_address->street_address;
		s2 = old_postal_address->street_address;
		if (!s1 && s2)
			delete_postal_address->street_address = g_strdup(s2);
		else if (s1)
			update_postal_address->street_address = g_strdup(s1);
		
		s1 =  new_postal_address->location;
		s2 = old_postal_address->location;
		if (!s1 && s2)
			delete_postal_address->location = g_strdup(s2);
		else if (s1)
			update_postal_address->location = g_strdup(s1);

		s1 = new_postal_address->city;
		s2 = old_postal_address->city;
		if (!s1 && s2)
			delete_postal_address->city = g_strdup(s2);
		else if (s1)
			update_postal_address->city = g_strdup(s1);

		s1 =  new_postal_address->state;
		s2 = old_postal_address->state;
		if (!s1 && s2)
			delete_postal_address->state = g_strdup(s2);
		else if (s1)
			update_postal_address->state = g_strdup(s1);
		s1 =  new_postal_address->postal_code;
		s2 = old_postal_address->postal_code;
		if (!s1 && s2)
			delete_postal_address->postal_code = g_strdup(s2);
		else if (s1)
			update_postal_address->postal_code = g_strdup(s1);

		s1 =  new_postal_address->country;
		s2 =  old_postal_address->country;
		if (!s1 && s2)
			delete_postal_address->country = g_strdup(s2);
		else if (s1)
			update_postal_address->country = g_strdup(s1);

		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_UPDATE, address_type, update_postal_address);
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_DELETE, address_type, delete_postal_address);
		
	} else if (!new_postal_address && old_postal_address) {
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_DELETE, address_type, copy_postal_address(old_postal_address));
	} else if (new_postal_address && !old_postal_address) {
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_ADD, address_type, copy_postal_address(new_postal_address));
	}
}


static void 
set_address_changes (EZimbraItem *new_item , EZimbraItem *old_item)
{
	set_postal_address_change (new_item, old_item, "Home");
	set_postal_address_change (new_item, old_item, "Office");
}


static void 
populate_birth_date (EContact *contact, gpointer data)
{
	EZimbraItem *item;
	char *value ;
	EContactDate *date;
  
	item = E_ZIMBRA_ITEM (data);
	value = e_zimbra_item_get_field_value (item, "birthday");
 	if (value) {
		date =  e_contact_date_from_string (value);
		e_contact_set (contact, E_CONTACT_BIRTH_DATE, date);
		e_contact_date_free (date);
	}
}


static void 
set_birth_date_in_zimbra_item (EZimbraItem *item, gpointer data)
{
	EContact *contact;
	EContactDate *date;
	char *date_string;
	contact = E_CONTACT (data);
	date = e_contact_get (contact, E_CONTACT_BIRTH_DATE);

	if (date)
	{
		date_string = e_contact_date_to_string (date);
		e_zimbra_item_set_field_value (item, "birthday", date_string);
		e_contact_date_free (date);
		g_free (date_string);
	}
}


static void 
set_birth_date_changes (EZimbraItem *new_item, EZimbraItem *old_item)
{
	char *new_birthday;
	char *old_birthday;

	new_birthday = e_zimbra_item_get_field_value (new_item, "birthday");
	old_birthday = e_zimbra_item_get_field_value (old_item, "birthday");
	
	if (new_birthday && old_birthday) {
		if (!g_str_equal (new_birthday, old_birthday))
			e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_UPDATE, "birthday", new_birthday);
	}
	else if (!new_birthday && old_birthday) {
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_DELETE, "birthday", old_birthday);
	}
	else if (new_birthday && !old_birthday) {
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_ADD, "birthday", new_birthday);
	}
}


static int email_fields[3] =
{
	E_CONTACT_EMAIL_1,
	E_CONTACT_EMAIL_2,
	E_CONTACT_EMAIL_3
};


static void 
populate_emails
	(
	EContact	*	contact,
	gpointer		data
	)
{
	GList		*	email_list;
	EZimbraItem *	item;
	int				i;

	item = E_ZIMBRA_ITEM (data);
	email_list = e_zimbra_item_get_email_list(item);

	for ( i = 0 ; i < 3 && email_list; i++, email_list = g_list_next (email_list))
	{
		if ( email_list->data ) 
		{
			e_contact_set( contact, email_fields[i], email_list->data );
		}
	}
}


static void 
set_emails_in_zimbra_item (EZimbraItem *item, gpointer data)
{
	GList *email_list;
	EContact *contact;
	char *email;
	int i;

	contact = E_CONTACT (data);
	email_list = NULL;
	for (i =0 ; i < 3; i++) {
		email = e_contact_get (contact, email_fields[i]);
		if(email)
			email_list = g_list_append (email_list, g_strdup (email));
	}
	e_zimbra_item_set_email_list (item, email_list);
}  


static void 
compare_string_lists ( GList *old_list, GList *new_list, GList **additions, GList **deletions)
{
	GList *temp, *old_list_copy;
	gboolean strings_matched;
	char *string1, *string2;
        
	if (old_list && new_list) {
		old_list_copy = g_list_copy (old_list);
		for ( ; new_list != NULL; new_list = g_list_next (new_list)) {
			
			string1 = new_list->data;
			temp = old_list;
			strings_matched = FALSE;
			for(; temp != NULL; temp = g_list_next (temp)) {
				string2 = temp->data;
				if ( g_str_equal (string1, string2)) {
					strings_matched = TRUE;
					old_list_copy = g_list_remove (old_list_copy, string2);
					break;
				}
			}
			if (!strings_matched)
				*additions = g_list_append (*additions, string1);
		}
		*deletions = old_list_copy;
	}
	else if (!new_list && old_list) 
		*deletions = g_list_copy (old_list);
	else if (new_list && !old_list)
		*additions = g_list_copy (new_list);
}

 
static void 
set_emails_changes (EZimbraItem *new_item, EZimbraItem *old_item)
{
	GList *old_email_list;
	GList *new_email_list;
	GList  *added_emails = NULL, *deleted_emails = NULL;

	old_email_list = e_zimbra_item_get_email_list (old_item);
	new_email_list = e_zimbra_item_get_email_list (new_item);
	compare_string_lists (old_email_list, new_email_list, &added_emails, &deleted_emails);
	if (added_emails)
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_ADD, "email", added_emails);
	if (deleted_emails)
		e_zimbra_item_set_change (new_item,  E_ZIMBRA_ITEM_CHANGE_TYPE_DELETE, "email", deleted_emails);
}
 
static void 
populate_full_name (EContact *contact, gpointer data)
{
	EZimbraItem *item;
	FullName  *full_name ;
	char *full_name_string;

	item = E_ZIMBRA_ITEM(data);
	full_name = e_zimbra_item_get_full_name (item);
	if (full_name) {
		full_name_string = g_strconcat ( (full_name->first_name == NULL) ? "\0" :    full_name->first_name, " ",
			    (full_name->middle_name == NULL) ? "\0" : full_name->middle_name, " ",
			    full_name->last_name == NULL ? "\0" : full_name->last_name, " ",
			    (full_name->name_suffix == NULL ) ? "\0" : full_name->name_suffix, NULL);
		full_name_string = g_strstrip (full_name_string);
		if (!g_str_equal (full_name_string, "\0"))
			e_contact_set (contact, E_CONTACT_FULL_NAME, full_name_string);
		g_free (full_name_string);
	}
}


static void 
set_full_name_in_zimbra_item (EZimbraItem *item, gpointer data)
{
	EContact *contact;
	char   *name;
	EContactName *contact_name;
	FullName *full_name;

	contact = E_CONTACT (data);
  
	name = e_contact_get (contact, E_CONTACT_FULL_NAME);

	if(name) {
		contact_name = e_contact_name_from_string (name);
		full_name = g_new0 (FullName, 1);
		if (contact_name && full_name) {
			full_name->name_prefix =  g_strdup (contact_name->prefixes);
			full_name->first_name =  g_strdup (contact_name->given);
			full_name->middle_name =  g_strdup (contact_name->additional);
			full_name->last_name =  g_strdup (contact_name->family);
			full_name->name_suffix = g_strdup (contact_name->suffixes);
			e_contact_name_free (contact_name);
		}
		e_zimbra_item_set_full_name (item, full_name);
	}
}

static FullName *
copy_full_name (FullName *full_name)
{
	FullName *full_name_copy = g_new0(FullName, 1);
	full_name_copy->name_prefix = g_strdup (full_name->name_prefix);
	full_name_copy->first_name =  g_strdup (full_name->first_name);
	full_name_copy->middle_name = g_strdup (full_name->middle_name);
	full_name_copy->last_name = g_strdup (full_name->last_name);
	full_name_copy->name_suffix = g_strdup (full_name->name_suffix);
	return full_name_copy;
}

static void 
set_full_name_changes (EZimbraItem *new_item, EZimbraItem *old_item)
{
	FullName *old_full_name;
	FullName *new_full_name;
	FullName  *update_full_name, *delete_full_name;
	char *s1, *s2;
	update_full_name = g_new0(FullName, 1);
	delete_full_name = g_new0 (FullName, 1);
	
	old_full_name = e_zimbra_item_get_full_name (old_item);
	new_full_name = e_zimbra_item_get_full_name (new_item);
	
	if (old_full_name && new_full_name) {
		s1 = new_full_name->name_prefix;
		s2 = old_full_name->name_prefix;
	        if(!s1 && s2)
			delete_full_name->name_prefix = g_strdup(s2);
		else if (s1)
			update_full_name->name_prefix = g_strdup(s1);
		s1 = new_full_name->first_name;
		s2  = old_full_name->first_name;
		if(!s1 && s2)
			delete_full_name->first_name = g_strdup(s2);
		else if (s1)
			update_full_name->first_name = g_strdup(s1);
		s1 = new_full_name->middle_name;
		s2  = old_full_name->middle_name;
		if(!s1 && s2)
			delete_full_name->middle_name = g_strdup(s2);
		else if (s1)
			update_full_name->middle_name = g_strdup(s1);
		
		s1 = new_full_name->last_name;
		s2 = old_full_name->last_name;
		if(!s1 && s2)
			delete_full_name->last_name = g_strdup(s2);
		else if (s1)
			update_full_name->last_name = g_strdup(s1);
		s1 = new_full_name->name_suffix;
		s2  = old_full_name->name_suffix;
		if(!s1 && s2)
			delete_full_name->name_suffix = g_strdup(s2);
		else if (s1)
			update_full_name->name_suffix = g_strdup(s1);
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_UPDATE,"full_name",  update_full_name);
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_DELETE,"full_name",  delete_full_name);
	
	} else if (!new_full_name && old_full_name) {
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_DELETE, "full_name", copy_full_name(old_full_name));
	} else if (new_full_name && !old_full_name) {
		e_zimbra_item_set_change (new_item, E_ZIMBRA_ITEM_CHANGE_TYPE_ADD, "full_name", copy_full_name(new_full_name));
	}
}

static void 
populate_contact_members (EContact *contact, gpointer data)
{
	EZimbraItem *item;
	GList *member_list;

	item = E_ZIMBRA_ITEM(data);
	member_list = e_zimbra_item_get_member_list (item);

	for (; member_list != NULL; member_list = g_list_next (member_list)) {
		EVCardAttribute *attr;
		EGroupMember *member;
		member = (EGroupMember *) member_list->data;

		attr = e_vcard_attribute_new (NULL, EVC_EMAIL);
		e_vcard_attribute_add_param_with_value (attr,
                                                        e_vcard_attribute_param_new (EVC_X_DEST_CONTACT_UID),
							member->id);
		e_vcard_attribute_add_param_with_value (attr,
                                                        e_vcard_attribute_param_new (EVC_X_DEST_EMAIL),
							member->email);
		if (member->name)
			e_vcard_attribute_add_param_with_value (attr,
                                                        e_vcard_attribute_param_new (EVC_X_DEST_NAME),
							member->name);
		e_vcard_attribute_add_value (attr, member->email);
		e_vcard_add_attribute (E_VCARD (contact), attr);
	}
}


static void 
set_categories_in_zimbra_item (EZimbraItem *item, EContact *contact, EBookBackendZimbra *ebz)
{
	GHashTable *categories_by_name;
	GList *category_names,  *category_ids;
	char *id;
	int status;

	categories_by_name = ebz->priv->categories_by_name;
	category_names = e_contact_get (contact, E_CONTACT_CATEGORY_LIST);
	category_ids = NULL;
	id = NULL;
	for (; category_names != NULL; category_names = g_list_next (category_names)) {
		if (!category_names->data || strlen(category_names->data) == 0 )
			continue;
		id = g_hash_table_lookup (categories_by_name, category_names->data);
		if (id) 
			category_ids = g_list_append (category_ids, g_strdup (id));
		else {
			EZimbraItem *category_item;

			category_item = e_zimbra_item_new_empty();
			e_zimbra_item_set_item_type (category_item,  E_ZIMBRA_ITEM_TYPE_CATEGORY);
			e_zimbra_item_set_category_name (category_item, category_names->data);
			status = e_zimbra_connection_create_item (ebz->priv->cnc, category_item, &id);
			if (status == E_ZIMBRA_CONNECTION_STATUS_OK && id != NULL) {
				char **components = g_strsplit (id, "@", -1);
				char *temp_id = components[0];
							
				g_hash_table_insert (categories_by_name, g_strdup (category_names->data), g_strdup(temp_id));
				g_hash_table_insert (ebz->priv->categories_by_id, g_strdup(temp_id), g_strdup (category_names->data));
				category_ids = g_list_append (category_ids, g_strdup(temp_id));
				g_free (id);
				g_strfreev(components);
			}
			g_object_unref (category_item);
		}
	}
	e_zimbra_item_set_categories (item, category_ids);	
}


static void 
fill_contact_from_zimbra_item
	(
	EContact	*	contact,
	EZimbraItem	*	item,
	GHashTable	*	categories_by_ids
	)
{
	char* value;
	int element_type;
	int i;
	gboolean is_contact_list;
	
	is_contact_list = e_zimbra_item_get_item_type (item) == E_ZIMBRA_ITEM_TYPE_GROUP ? TRUE: FALSE;
	e_contact_set (contact, E_CONTACT_IS_LIST, GINT_TO_POINTER (is_contact_list));
	if (is_contact_list)
		e_contact_set (contact, E_CONTACT_LIST_SHOW_ADDRESSES, GINT_TO_POINTER (TRUE));

	for ( i = 0; i < g_num_mappings; i++ )
	{
		element_type = g_mappings[i].element_type;

		if ( element_type == ELEMENT_TYPE_SIMPLE )
		{
			if ( g_mappings[i].field_id != E_CONTACT_BOOK_URI )
			{
				if ( ( value = e_zimbra_item_get_field_value (item, g_mappings[i].element_name) ) != NULL )
				{
					e_contact_set (contact, g_mappings[i].field_id, value);
				}
			}
		}
		else if ( element_type == ELEMENT_TYPE_COMPLEX )
		{
			if ( g_mappings[i].field_id == E_CONTACT_CATEGORIES)
			{
				GList *category_ids, *category_names;
				char *name;

				category_names = NULL;
				category_ids = e_zimbra_item_get_categories (item);
				for (; category_ids; category_ids = g_list_next (category_ids)) {
					name = g_hash_table_lookup (categories_by_ids, category_ids->data);
					if (name)
						category_names = g_list_append (category_names, name);
				}
				if (category_names) {
					e_contact_set (contact, E_CONTACT_CATEGORY_LIST, category_names);
					g_list_free (category_names);
				}
			}
			else
			{     
				g_mappings[i].populate_contact_func(contact, item);
			}
		}
	}
}


static void
e_book_backend_zimbra_create_contact
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32				opid,
	const char		*	vcard
	)
{
	EContact							*	contact			=	NULL;
	EBookBackendZimbra					*	ebz				=	NULL;
	EDataBookView						*	book_view		=	NULL;
	char								*	id				=	NULL;
	gboolean								mutex_locked	=	FALSE;
	char									hostname[ HOST_NAME_MAX ];
	gboolean								ok;
	GNOME_Evolution_Addressbook_CallStatus	err;

Log( "in %s\n", __FUNCTION__ );

	ebz = E_BOOK_BACKEND_ZIMBRA( backend );
	zimbra_check( ebz, exit, err = GNOME_Evolution_Addressbook_OtherError );
	// zimbra_check( ebz->priv->is_writable, exit, err = GNOME_Evolution_Addressbook_PermissionDenied );
	
	contact = e_contact_new_from_vcard( vcard );
	zimbra_check( contact, exit, err = GNOME_Evolution_Addressbook_OtherError );

	gethostname( hostname, HOST_NAME_MAX );
	id = g_strdup_printf( "local-%s-%lx", hostname, time( NULL ) );
	zimbra_check( id, exit, err = GNOME_Evolution_Addressbook_OtherError );

	e_contact_set( contact, E_CONTACT_UID, id );

	g_mutex_lock( ebz->priv->update_mutex );
	mutex_locked = TRUE;

	if ( ( book_view = find_book_view( ebz ) ) != NULL )
	{
		ZimbraBackendSearchClosure * closure;

		bonobo_object_ref( book_view );

		if ( ( closure = get_closure( book_view ) ) != NULL )
		{
			g_mutex_lock( closure->mutex );
			g_cond_signal( closure->cond );
			g_mutex_unlock( closure->mutex );
		}
	}

	e_book_backend_summary_add_contact( ebz->priv->summary, contact );
	e_book_backend_cache_add_contact( ebz->priv->cache, contact );

	switch ( ebz->priv->mode )
	{
		case GNOME_Evolution_Addressbook_MODE_LOCAL:
		{
			ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id );
			zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );
		}
		break;

		case GNOME_Evolution_Addressbook_MODE_REMOTE:
		{
			if ( !send_update( ebz, NULL, contact ) )
			{
				ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id );
				zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );
			}
		}
		break;
	}

	if ( book_view )
	{
		e_data_book_view_notify_update( book_view, contact );
		e_data_book_view_notify_complete( book_view, GNOME_Evolution_Addressbook_Success );
	}

	err = GNOME_Evolution_Addressbook_Success;

exit:

	if ( err == GNOME_Evolution_Addressbook_Success )
	{
		e_data_book_respond_create( book, opid, err, contact );
	}
	else
	{
		e_data_book_respond_create( book, opid, err, NULL );
	}

	if ( book_view )
	{
		bonobo_object_unref( book_view );
	}

	if ( mutex_locked )
	{
		g_mutex_unlock( ebz->priv->update_mutex );
	}
}


static void
e_book_backend_zimbra_modify_contact
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32				opid,
	const char		*	vcard
	)
{
	EContact							*	contact			=	NULL;
	EBookBackendZimbra					*	ebz				=	NULL;
	EDataBookView						*	book_view		=	NULL;
	char								*	id				=	NULL;
	gboolean								mutex_locked	=	FALSE;
	gboolean								ok;
	GNOME_Evolution_Addressbook_CallStatus	err;

Log( "in %s\n", __FUNCTION__ );

	ebz = E_BOOK_BACKEND_ZIMBRA (backend);
	zimbra_check( ebz, exit, err = GNOME_Evolution_Addressbook_OtherError );
	zimbra_check( ebz->priv->is_writable, exit, err = GNOME_Evolution_Addressbook_PermissionDenied );

	contact = e_contact_new_from_vcard( vcard );
	zimbra_check( contact, exit, err = GNOME_Evolution_Addressbook_OtherError );

	id = e_contact_get( contact, E_CONTACT_UID );

	g_mutex_lock( ebz->priv->update_mutex );
	mutex_locked = TRUE;

	if ( ( book_view = find_book_view( ebz ) ) != NULL )
	{
		ZimbraBackendSearchClosure * closure;

		bonobo_object_ref( book_view );

		if ( ( closure = get_closure( book_view ) ) != NULL )
		{
			g_mutex_lock( closure->mutex );
			g_cond_signal( closure->cond );
			g_mutex_unlock( closure->mutex );
		}
	}

	e_book_backend_cache_remove_contact( ebz->priv->cache, id );
	e_book_backend_summary_remove_contact( ebz->priv->summary, id );
	e_book_backend_cache_add_contact( ebz->priv->cache, contact );
	e_book_backend_summary_add_contact( ebz->priv->summary, contact );

	ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id );
	zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );

	if ( ebz->priv->cnc )
	{
		ok = e_zimbra_connection_sync( ebz->priv->cnc );
		zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );
	}

	if ( book_view )
	{
		e_data_book_view_notify_update( book_view, contact );
		e_data_book_view_notify_complete( book_view, GNOME_Evolution_Addressbook_Success );
	}

	err = GNOME_Evolution_Addressbook_Success;

exit:

	if ( err == GNOME_Evolution_Addressbook_Success )
	{
		e_data_book_respond_modify( book, opid, err, contact );
	}
	else
	{
		e_data_book_respond_modify( book, opid, err, NULL );
	}

	if ( book_view )
	{
		bonobo_object_unref( book_view );
	}

	if ( mutex_locked )
	{
		g_mutex_unlock( ebz->priv->update_mutex );
	}

	if ( contact )
	{
		g_object_unref( contact );
	}
}


static void
e_book_backend_zimbra_remove_contacts
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32				opid,
	GList			*	ids
	)
{
	EBookBackendZimbra					*	ebz;
	EDataBookView						*	book_view	=	NULL;
	char								*	id;
	gboolean								mutex_locked = FALSE;
	GList								*	deleted_ids = NULL;
	gboolean								ok;
	GNOME_Evolution_Addressbook_CallStatus	err;

Log( "in %s\n", __FUNCTION__ );

	ebz = E_BOOK_BACKEND_ZIMBRA( backend );
	zimbra_check( ebz, exit, err = GNOME_Evolution_Addressbook_OtherError );
	zimbra_check( ebz->priv->is_writable, exit, err = GNOME_Evolution_Addressbook_PermissionDenied );

	g_mutex_lock( ebz->priv->update_mutex );
	mutex_locked = TRUE;

	if ( ( book_view = find_book_view( ebz ) ) != NULL )
	{
		ZimbraBackendSearchClosure * closure;

		bonobo_object_ref( book_view );

		if ( ( closure = get_closure( book_view ) ) != NULL )
		{
			g_mutex_lock( closure->mutex );
			g_cond_signal( closure->cond );
			g_mutex_unlock( closure->mutex );
		}
	}

	for (; ids != NULL; ids = g_list_next( ids ) )
	{
		id = ( char* ) ids->data;

		e_book_backend_cache_remove_contact( ebz->priv->cache, id );
		e_book_backend_summary_remove_contact( ebz->priv->summary, id );

fprintf( stderr, "adding id to delete cache\n" );

		if ( !strstr( id, "local" ) )
		{
			ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( ebz->priv->cache ), "delete", id );
			zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );

			if ( ebz->priv->cnc )
			{
fprintf( stderr, "forcing a sync\n" );

				ok = e_zimbra_connection_sync( ebz->priv->cnc );
				zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );
			}
		}

		deleted_ids = g_list_append( deleted_ids, id );

		if ( book_view )
		{
			e_data_book_view_notify_remove( book_view, id );
			e_data_book_view_notify_complete( book_view, GNOME_Evolution_Addressbook_Success );
		}
	}

	err = GNOME_Evolution_Addressbook_Success;

exit:

	if ( err == GNOME_Evolution_Addressbook_Success )
	{
		e_data_book_respond_remove_contacts( book, opid, err, deleted_ids );
	}
	else
	{
		e_data_book_respond_remove_contacts( book, opid, err, NULL );
	}

	if ( book_view )
	{
		bonobo_object_unref( book_view );
	}

	if ( mutex_locked )
	{
		g_mutex_unlock( ebz->priv->update_mutex );
	}
}


static void
e_book_backend_zimbra_get_contact
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32				opid,
	const char		*	id
	)
{
	EBookBackendZimbra *ebz;
	int status ;
	EZimbraItem *item;
	EContact *contact;
	char *vcard;

Log( "in %s\n", __FUNCTION__ );

	if (enable_debug)
		Log("\ne_book_backend_zimbra_get_contact...\n");	

	ebz =  E_BOOK_BACKEND_ZIMBRA (backend);

	switch ( ebz->priv->mode )
	{
		case GNOME_Evolution_Addressbook_MODE_LOCAL:
		{
			contact = e_book_backend_cache_get_contact (ebz->priv->cache, id);
			vcard =  e_vcard_to_string (E_VCARD (contact), EVC_FORMAT_VCARD_30);
			if (contact)
			{
				e_data_book_respond_get_contact(book, opid, GNOME_Evolution_Addressbook_Success, vcard);
				g_free (vcard);
				g_object_unref (contact);
			}
			else
			{
				e_data_book_respond_get_contact(book, opid, GNOME_Evolution_Addressbook_ContactNotFound, "");
			}
		}
		break;

		case GNOME_Evolution_Addressbook_MODE_REMOTE:
		{
			if (ebz->priv->cnc == NULL)
			{
				e_data_book_respond_get_contact (book, opid, GNOME_Evolution_Addressbook_OtherError, NULL);
				return;
			}

			status = e_zimbra_connection_get_item(ebz->priv->cnc, ebz->priv->folder_id, id, "name email default members", &item);

			if ( !item )
			{
				e_data_book_respond_get_contact (book, opid, GNOME_Evolution_Addressbook_ContactNotFound, "");  
				break;
			}

			contact = e_contact_new ();
			fill_contact_from_zimbra_item (contact, item, ebz->priv->categories_by_id);
			e_contact_set (contact, E_CONTACT_BOOK_URI, ebz->priv->original_uri);
			vcard = e_vcard_to_string (E_VCARD (contact), EVC_FORMAT_VCARD_30);
			e_data_book_respond_get_contact (book, opid, GNOME_Evolution_Addressbook_Success, vcard);
			g_free (vcard);
			g_object_unref (contact);
			g_object_unref (item);
		}
		break;

		default:
		{
		}
		break;
	}
}


static gboolean
e_book_backend_zimbra_summary_is_summary_query
	(
	EBookBackendSummary	*	summary,
	const char			*	query
	)
{
	static const char * wildcard = "(contains \"file_as\" \"\")";

	if ( query && strcmp( query, "(contains \"x-evolution-any-field\"  \"\")") == 0 )
	{
		query = wildcard;
	}

	return e_book_backend_summary_is_summary_query( summary, query );
}


static GPtrArray*
e_book_backend_zimbra_summary_search
	(
	EBookBackendSummary	*	summary,
	const char			*	query
	)
{
	static const char * wildcard = "(contains \"file_as\" \"\")";

fprintf( stderr, "in zimbra_summary_search: query = %s\n", query );

	if ( query && strcmp( query, "(contains \"x-evolution-any-field\"  \"\")") == 0 )
	{
		query = wildcard;
	}

fprintf( stderr, "caling summary_search: query = %s\n", query );

	return e_book_backend_summary_search( summary, query );
}


static void
e_book_backend_zimbra_get_contact_list
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32				opid,
	const char		*	query
	)
{
	GList *vcard_list;
	GList *zitems, *contacts = NULL, *temp;
	EBookBackendZimbra *ebz;
	GPtrArray *ids;

	ebz = E_BOOK_BACKEND_ZIMBRA (backend);
	vcard_list = NULL;
	zitems = NULL;

Log( "in %s\n", __FUNCTION__ );

	if (enable_debug)
		Log("\ne_book_backend_zimbra_get_contact_list...\n");

	if (ebz->priv->is_summary_ready && e_book_backend_zimbra_summary_is_summary_query (ebz->priv->summary, query))
	{
		int i;

fprintf( stderr, "getting summary stuff\n" );

		ids = e_book_backend_zimbra_summary_search (ebz->priv->summary, query);

		for (i = 0; i < ids->len; i ++)
		{
			char *uid = g_ptr_array_index (ids, i);

fprintf( stderr, "getting contact from summary\n" );

			EContact * contact = e_book_backend_cache_get_contact( ebz->priv->cache, uid );
			contacts = g_list_append( contacts, contact );
			// g_object_unref (contact);
		}

		g_ptr_array_free( ids, TRUE );
	}
	else
	{
fprintf( stderr, "calling e_book_backend_cache_get_contacts\n" );
		contacts = e_book_backend_cache_get_contacts( ebz->priv->cache, query );
	}

	temp = contacts;
	for (; contacts != NULL; contacts = g_list_next( contacts ) )
	{
		char * converted;

		converted	= e_vcard_to_string( E_VCARD( contacts->data ), EVC_FORMAT_VCARD_30 );
		vcard_list	= g_list_append( vcard_list, converted );

		g_object_unref( contacts->data );
	}

	e_data_book_respond_get_contact_list( book, opid, GNOME_Evolution_Addressbook_Success, vcard_list );

	if (temp)
	{
		g_list_free (temp);
	}
}

	
static void
closure_destroy (ZimbraBackendSearchClosure *closure)
{
	g_mutex_free (closure->mutex);
	g_cond_free (closure->cond);
	g_free (closure);
}

static ZimbraBackendSearchClosure*
init_closure (EDataBookView *book_view, EBookBackendZimbra *bg)
{
	ZimbraBackendSearchClosure *closure = g_new (ZimbraBackendSearchClosure, 1);

	closure->bg = bg;
	closure->mutex = g_mutex_new ();
	closure->cond = g_cond_new ();
	closure->thread = NULL;
	closure->stopped = FALSE;

	g_object_set_data_full (G_OBJECT (book_view), "EBookBackendZimbra.BookView::closure",
				closure, (GDestroyNotify)closure_destroy);

	return closure;
}


static void
get_contacts_from_cache
	(
	EBookBackendZimbraPrivate	*	priv, 
	const char					*	query,
	GPtrArray					*	ids,
	EDataBookView				*	book_view, 
	ZimbraBackendSearchClosure	*	closure
	)
{
	gboolean	stopped = FALSE;
	int			i;

	if (enable_debug)
		Log("\nread contacts from cache for the ids found in summary\n");

	for ( i = 0; i < ids->len; i++ )
	{
		EContact	*	contact;
		char		*	uid = g_ptr_array_index( ids, i );

		g_mutex_lock( closure->mutex );
		stopped = closure->stopped;
		g_mutex_unlock( closure->mutex );

		if ( stopped )
		{
			break;	
		}

		if ( ( contact = e_book_backend_cache_get_contact( priv->cache, uid ) ) != NULL )
		{
			e_data_book_view_notify_update( book_view, contact );
			g_object_unref( contact );
		}
		else
		{
			g_warning( "unable to find uid '%s' in cache", uid );
		}
	}

	if ( !stopped )
	{
		e_data_book_view_notify_complete( book_view, GNOME_Evolution_Addressbook_Success );
	}
}
 

static gpointer
book_view_thread
	(
	gpointer data
	)
{
	EBookBackendZimbra			*	ebz					= NULL;
	GList						*	zitems				= NULL;
	GList						*	temp_list			= NULL;
	GList						*	contacts			= NULL;
	const char					*	query				= NULL;
	GPtrArray					*	ids					= NULL;
	gboolean						stopped				= FALSE;
	EDataBookView				*	book_view			= data;
	ZimbraBackendSearchClosure	*	closure				= get_closure (book_view);

	ebz  = closure->bg;
	zitems = NULL;

Log( "in %s\n", __FUNCTION__ );

	if (enable_debug)
		Log("start book view for %s \n", ebz->priv->book_name);

	bonobo_object_ref( book_view );
	g_mutex_lock(closure->mutex );
	g_cond_signal(closure->cond );
	g_mutex_unlock( closure->mutex );
	
	query = e_data_book_view_get_card_query( book_view );

	if (enable_debug)
		Log("get view for query %s \n", query);

	if ( !ebz->priv->cache )
	{
		goto exit;
	}

	if ( ebz->priv->is_summary_ready && e_book_backend_zimbra_summary_is_summary_query( ebz->priv->summary, query ) )
	{
		if (enable_debug)
			Log("reading the uids from summary \n");

		ids = e_book_backend_zimbra_summary_search( ebz->priv->summary, query );

		if (ids && ids->len > 0)
		{
			get_contacts_from_cache (ebz->priv, query, ids, book_view, closure);
			g_ptr_array_free (ids, TRUE);
		}
	}
	else
	{
		// fall back to cache

		if (enable_debug)
			Log("summary not found, reading the uids from cache\n");
		
		contacts = e_book_backend_cache_get_contacts( ebz->priv->cache, query );
		temp_list = contacts;

		for (; contacts != NULL; contacts = g_list_next(contacts))
		{
			g_mutex_lock( closure->mutex );
			stopped = closure->stopped;
			g_mutex_unlock( closure->mutex );

			if ( stopped )
			{
				for ( ; contacts != NULL; contacts = g_list_next (contacts))
				{
					g_object_unref (contacts->data);
				}

				break;
			}
				
			e_data_book_view_notify_update( book_view, E_CONTACT( contacts->data ) );
			g_object_unref (contacts->data);
		}

	}

exit:

	if ( !stopped )
	{
		e_data_book_view_notify_complete( book_view, GNOME_Evolution_Addressbook_Success );
	}

	if ( book_view )
	{
		bonobo_object_unref( book_view );
	}

	if ( temp_list )
	{
		g_list_free( temp_list );
	}

	return NULL;
}


static void
e_book_backend_zimbra_start_book_view
	(
	EBookBackend	*	backend,
	EDataBookView	*	book_view
	)
{
	ZimbraBackendSearchClosure * closure = init_closure (book_view, E_BOOK_BACKEND_ZIMBRA (backend));

Log( "in %s\n", __FUNCTION__ );

	g_mutex_lock (closure->mutex);
	closure->thread = g_thread_create( book_view_thread, book_view, FALSE, NULL );
	g_cond_wait (closure->cond, closure->mutex);
	
	// At this point we know the book view thread is actually running

	g_mutex_unlock( closure->mutex );
}
  

static void
e_book_backend_zimbra_stop_book_view
	(
	EBookBackend	*	backend,
	EDataBookView	*	book_view
	)
{
	ZimbraBackendSearchClosure * closure;
	
Log( "in %s\n", __FUNCTION__ );

	if (enable_debug)
		Log("\ne_book_backend_zimbra_stop_book_view...\n");

	closure = get_closure( book_view );
	zimbra_check( closure, exit, g_warning( "%s: get_closure returned NULL", __FUNCTION__ ) );

	g_mutex_lock( closure->mutex );
	closure->stopped = TRUE;
	g_mutex_unlock( closure->mutex );

exit:

	return;
}


static void
e_book_backend_zimbra_get_changes (EBookBackend *backend,
				      EDataBook    *book,
				      guint32       opid,
				      const char *change_id  )
{
	if (enable_debug)
		Log("\ne_book_backend_zimbra_get_changes...\n");

Log( "in %s\n", __FUNCTION__ );

	/* FIXME : provide implmentation */
}


static void
book_view_notify_status
	(
	EDataBookView	*	view,
	const char		*	status
	)
{
	if ( view )
	{
		e_data_book_view_notify_status_message( view, status );
	}
}


static void
build_summary
	(
	EBookBackendZimbraPrivate *priv
	)
{
	gchar *query_string;
	GList *contacts, *temp_list = NULL;
	GTimeVal start, end;
	unsigned long diff;

	if (enable_debug) {
		g_get_current_time(&start);
		Log("summary file not found or not up-to-date, building summary for %s\n", 
			priv->book_name);
	}

	/* build summary from cache */
	query_string = g_strdup_printf("(or (beginswith \"file_as\" \"\") "
					"    (beginswith \"full_name\" \"\") "
					"    (beginswith \"email\" \"\") "
					"    (beginswith \"nickname\" \"\"))");
	contacts = e_book_backend_cache_get_contacts (priv->cache, query_string);
	g_free (query_string);
	temp_list = contacts;
	for (; contacts != NULL; contacts = g_list_next(contacts))
	{
		e_book_backend_summary_add_contact (priv->summary, contacts->data);
		g_object_unref (contacts->data);
	}

	if (temp_list)
	{
		g_list_free (temp_list);
	}

	priv->is_summary_ready = TRUE;
	
	if (enable_debug) {
		g_get_current_time(&end);
		diff = end.tv_sec * 1000 + end.tv_usec/1000;
		diff -= start.tv_sec * 1000 + start.tv_usec/1000;
		Log("building summary for %s took %ld.%03ld seconds \n", 
			priv->book_name, diff / 1000, diff % 1000);
	}
}


static gboolean
send_update
	(
	EBookBackendZimbra	*	ebz,
	EDataBookView		*	book_view,
	EContact			*	contact
	)
{
	EZimbraItem			*	item	=	NULL;
	const char			*	id		=	NULL;
	int						j;
	EZimbraConnectionStatus	err		=	0;

	zimbra_check( contact, exit, err = E_ZIMBRA_CONNECTION_STATUS_UNKNOWN );

	id = e_contact_get_const( contact, E_CONTACT_UID );

	zimbra_check( id, exit, err = E_ZIMBRA_CONNECTION_STATUS_UNKNOWN );

	// Create a new item from this guy
	
	item = e_zimbra_item_new_empty();
	zimbra_check( item, exit, err = E_ZIMBRA_CONNECTION_STATUS_UNKNOWN );

	e_zimbra_item_set_item_type( item, E_ZIMBRA_ITEM_TYPE_CONTACT );
	e_zimbra_item_set_folder_id( item, g_strdup( ebz->priv->folder_id ) );

	for ( j = 0; j < g_num_mappings; j++ )
	{
  		int			element_type;
		char	*	value;
	
		element_type = g_mappings[j].element_type;
	
		if ( element_type == ELEMENT_TYPE_SIMPLE )
		{
			if ( ( value = e_contact_get( contact, g_mappings[j].field_id ) ) != NULL )
			{
				e_zimbra_item_set_field_value( item, g_mappings[j].element_name, value );
			}
		}
		else if ( element_type == ELEMENT_TYPE_COMPLEX )
		{
			if ( g_mappings[j].field_id == E_CONTACT_CATEGORIES )
			{
				set_categories_in_zimbra_item( item, contact, ebz );
			}
			else if ( g_mappings[j].field_id == E_CONTACT_EMAIL )
			{
			}
			else
			{
				g_mappings[j].set_value_in_zimbra_item( item, contact );
			}
		}
	}
	
	// Is it a new one
	
	if ( strstr( id, "local" ) )
	{
		char * new_id;
								
		err = e_zimbra_connection_create_item( ebz->priv->cnc, item, &new_id );
			
		if ( err == E_ZIMBRA_CONNECTION_STATUS_INVALID_CONNECTION )
		{
			err = e_zimbra_connection_create_item( ebz->priv->cnc, item, &new_id );
		}

		if ( err == E_ZIMBRA_CONNECTION_STATUS_OK )
		{
			// If it's a new one, then we need to get the real id after creating
			// it in ZCS, and replace the old id with the new one.
		
			e_book_backend_cache_remove_contact( ebz->priv->cache, id );
			e_book_backend_summary_remove_contact( ebz->priv->summary, id );

			e_contact_set (contact, E_CONTACT_UID, new_id );
		
			e_book_backend_cache_add_contact( ebz->priv->cache, contact );
			e_book_backend_summary_add_contact( ebz->priv->summary, contact );

			if ( book_view )
			{
				e_data_book_view_notify_remove( book_view, id );
				e_data_book_view_notify_update( book_view, contact );
			}

			g_free( new_id );
		}
		else
		{
			g_warning( "e_zimbra_connection_create_item failed with error code: %d", err );
		}
	}
	else
	{
		err = e_zimbra_connection_modify_item( ebz->priv->cnc, item, id );
				
		if ( err == E_ZIMBRA_CONNECTION_STATUS_INVALID_CONNECTION )
		{
			err = e_zimbra_connection_modify_item( ebz->priv->cnc, item, id );
		}
	
		if ( err != E_ZIMBRA_CONNECTION_STATUS_OK )
		{
			g_warning( "e_zimbra_connection_modify_item failed with error code: %d", err );
		}
	}

	g_object_unref( item );

exit:

	return !err ? TRUE : FALSE;
}


static gboolean
send_remove
	(
	EBookBackendZimbra	*	ebz,
	const char			*	id
	)
{
	EZimbraConnectionStatus err;

	err = e_zimbra_connection_remove_item( ebz->priv->cnc, ebz->priv->folder_id, E_ZIMBRA_ITEM_TYPE_CONTACT, id );
	
	if ( err == E_ZIMBRA_CONNECTION_STATUS_INVALID_CONNECTION )
	{
		err = e_zimbra_connection_remove_item( ebz->priv->cnc, ebz->priv->folder_id, E_ZIMBRA_ITEM_TYPE_CONTACT, id );
	}

	if ( err == E_ZIMBRA_CONNECTION_STATUS_NO_SUCH_ITEM )
	{
		err = E_ZIMBRA_CONNECTION_STATUS_OK;
	}

	return !err ? TRUE : FALSE;
}


static EZimbraConnectionStatus
sync_changes
	(
	gpointer				handle,
	const char			*	name,
	GList				*	updates,
	GList				*	deletes
	)	
{
	EBookBackendZimbra			*	ebz;
	char						*	sync_token		= NULL;
	char						*	status_msg;
	EDataBookView				*	book_view		= NULL;
	EBookBackendZimbraPrivate	*	priv;
	EBookBackendCache			*	cache;
	ZimbraBackendSearchClosure	*	closure;
	EContact					*	contact			= NULL;
	gboolean						mutex_locked	= FALSE;
	gboolean						cache_frozen	= FALSE;
	int								contact_num		= 0;
	GTimeVal						start;
	GTimeVal						end;
	int								i;
	GList						*	l;
	gboolean						ok				= TRUE;
	GPtrArray					*	our_updates		=	NULL;
	GPtrArray					*	our_deletes		=	NULL;
	EZimbraConnectionStatus			err				=	0;

	zimbra_check( handle, exit, ok = FALSE );

	ebz = ( EBookBackendZimbra* ) handle;

	if ( enable_debug )
	{
		g_get_current_time(&start);
		Log("syncing cache for %s\n", ebz->priv->book_name );
	}

fprintf( stderr, "in sync_changes!!!\n" );

	priv	= ebz->priv;
	cache	= priv->cache;
	
	g_mutex_lock( priv->update_mutex );
	mutex_locked = TRUE;

	if ( ( book_view = find_book_view( ebz ) ) != NULL )
	{
fprintf( stderr, "found book_view\n" );

		bonobo_object_ref( book_view );

		if ( ( closure = get_closure( book_view ) ) != NULL )
		{
			g_mutex_lock( closure->mutex );
			g_cond_signal( closure->cond );
			g_mutex_unlock( closure->mutex );
		}
	}

	e_file_cache_freeze_changes( E_FILE_CACHE( cache ) );
	cache_frozen = TRUE;

	// Pull changes from ZCS

fprintf( stderr, "number of updates: %d\n", g_list_length( updates ) );

	for ( l = updates; l; l = l->next )
	{
		EZimbraItem * item;

		item = E_ZIMBRA_ITEM( l->data );
	
		// newly added to server

		contact = e_contact_new();

		if ( contact )
		{
			const char * id;

			fill_contact_from_zimbra_item( contact, item, ebz->priv->categories_by_id );
			e_contact_set( contact, E_CONTACT_BOOK_URI, priv->original_uri );

			id = e_contact_get_const( contact, E_CONTACT_UID );

fprintf( stderr, "new contact: id = %s\n", id );

			if ( id )
			{
				contact_num++;

				if ( book_view )
				{
					status_msg = g_strdup_printf(_("Updating contacts cache (%d)... "), contact_num );
					book_view_notify_status( book_view, status_msg );
					g_free( status_msg );
				}

				if ( e_book_backend_cache_check_contact( ebz->priv->cache, id ) )
				{
	fprintf( stderr, "removing contact from summary and cache!!!\n" );

					if ( e_zimbra_utils_find_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id ) )
					{
						// Uh-oh.  It was modified on the server, and modified locally

						g_warning( "conflict detected...modified on ZCS and modified locally" );

						e_zimbra_utils_del_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id );
					}

					e_book_backend_cache_remove_contact( ebz->priv->cache, id );
					e_book_backend_summary_remove_contact( ebz->priv->summary, id );
				}
				else if ( e_zimbra_utils_find_cache_string( E_FILE_CACHE( ebz->priv->cache ), "delete", id ) )
				{
					// Uh-oh.  It was modified on the server, and deleted locally

					g_warning( "conflict detected...modified on ZCS and deleted locally" );

					e_zimbra_utils_del_cache_string( E_FILE_CACHE( ebz->priv->cache ), "delete", id );
				}

fprintf( stderr, "adding contact !!!\n" );

				e_book_backend_cache_add_contact( ebz->priv->cache, contact );
				e_book_backend_summary_add_contact( ebz->priv->summary, contact );

				if ( book_view )
				{
					e_data_book_view_notify_update( book_view, contact );
				}
			}
			else
			{	
fprintf( stderr, "********* no id!!!! *************\n" );
			}

			g_object_unref( contact );
		}
	}

	for ( l = updates; l; l = l->next )
	{
		const char * id;

		id = ( const char* ) l->data;

		// deleted from the server

		if ( e_book_backend_cache_check_contact( ebz->priv->cache, id ) )
		{
			if ( e_zimbra_utils_find_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id ) )
			{
				// Uh-oh.  It was deleted on the server, and modified locally

				g_warning( "conflict detected...deleted on ZCS and modified locally" );

				e_zimbra_utils_del_cache_string( E_FILE_CACHE( ebz->priv->cache ), "update", id );
			}

			contact_num++;

			if ( book_view )
			{
				status_msg = g_strdup_printf(_("Updating contacts cache (%d)... "), contact_num);
				book_view_notify_status( book_view, status_msg );
				g_free(status_msg );
			}

			e_book_backend_cache_remove_contact( ebz->priv->cache, id );
			e_book_backend_summary_remove_contact( ebz->priv->summary, id );

			if ( book_view )
			{
				e_data_book_view_notify_remove( book_view, id );
			}
		}
		else if ( e_zimbra_utils_find_cache_string( E_FILE_CACHE( ebz->priv->cache ), "delete", id ) )
		{
			// Both deleted.  Ignore this.

			e_zimbra_utils_del_cache_string( E_FILE_CACHE( ebz->priv->cache ), "delete", id );
		}
	}

	// Push changes to ZCS

	if ( ( our_updates = e_zimbra_utils_get_cache_array( E_FILE_CACHE( ebz->priv->cache ), "update" ) ) != NULL )
	{
		for ( i = 0; i < our_updates->len; i++ )
		{
			const char * id = g_ptr_array_index( our_updates, i );

			if ( ( contact = e_book_backend_cache_get_contact( ebz->priv->cache, id ) ) && ( send_update( ebz, book_view, contact ) ) )
			{
				e_zimbra_utils_del_cache_string( E_FILE_CACHE( ebz->priv->cache), "update", id );
			}
		}

		g_ptr_array_foreach( our_updates, ( GFunc ) g_free, NULL );
		g_ptr_array_free( our_updates, TRUE );
	}

fprintf( stderr, "looking in delete cache\n" );

	if ( ( our_deletes = e_zimbra_utils_get_cache_array( E_FILE_CACHE( ebz->priv->cache ), "delete" ) ) != NULL )
	{
		for ( i = 0; i < our_deletes->len; i++ )
		{
			const char * id = g_ptr_array_index( our_deletes, i );

			if ( strstr( id, "local" ) || send_remove( ebz, id ) )
			{
				e_zimbra_utils_del_cache_string( E_FILE_CACHE( ebz->priv->cache ), "delete", id );
			}
		}

		g_ptr_array_foreach( our_deletes, ( GFunc ) g_free, NULL );
		g_ptr_array_free( our_deletes, TRUE );
	}

	e_book_backend_cache_set_populated( ebz->priv->cache );

	ebz->priv->is_summary_ready	= TRUE;
	ebz->priv->is_cache_ready	= TRUE;

	if ( enable_debug )
	{
		unsigned long diff;

		g_get_current_time(&end);
		diff = end.tv_sec * 1000 + end.tv_usec/1000;
		diff -= start.tv_sec * 1000 + start.tv_usec/1000;
		Log("updating Zimbra contacts cache took %ld.%03ld seconds for %d changes\n", 
			diff / 1000, diff % 1000, contact_num);
	}

exit:

	if ( ok )
	{
		e_file_cache_replace_object( E_FILE_CACHE( cache ), "syncToken", sync_token );	
		g_free( sync_token );
	}

	if ( cache_frozen )
	{
		e_file_cache_thaw_changes( E_FILE_CACHE( cache ) );
	}

	if ( mutex_locked )
	{
		g_mutex_unlock( priv->update_mutex );
	}

	if ( book_view )
	{
		e_data_book_view_notify_complete( book_view, GNOME_Evolution_Addressbook_Success );
		bonobo_object_unref( book_view );
	}

	return err;
}


static GNOME_Evolution_Addressbook_CallStatus
go_online
	(
	EBookBackendZimbra	*	ebz
	)
{
	ESource								*	source;
	EZimbraFolder						*	folder;
	gboolean								ok;
	GNOME_Evolution_Addressbook_CallStatus	err;

fprintf( stderr, "in go_online\n" );

	source = e_book_backend_get_source( E_BOOK_BACKEND( ebz ) );
	zimbra_check( source, exit, err = GNOME_Evolution_Addressbook_NoSuchBook );

	/* create connection to server */

	ebz->priv->cnc = e_zimbra_connection_new( source, ebz->priv->username, ebz->priv->password );
	zimbra_check( E_IS_ZIMBRA_CONNECTION( ebz->priv->cnc ), exit,  err = GNOME_Evolution_Addressbook_AuthenticationFailed );

	folder = e_zimbra_connection_peek_folder_by_id( ebz->priv->cnc, ebz->priv->folder_id );
	zimbra_check( folder, exit,  err = GNOME_Evolution_Addressbook_OtherError );

	ebz->priv->mode			= GNOME_Evolution_Addressbook_MODE_REMOTE;

fprintf( stderr, "registering client!!!!\n" );

	ok = e_zimbra_connection_register_client( ebz->priv->cnc, ebz->priv->folder_id, ( gpointer ) ebz, sync_changes );
	zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );

	err = GNOME_Evolution_Addressbook_Success;

exit:

	return err;
}


static void
e_book_backend_zimbra_authenticate_user
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32       		opid,
	const char		*	username,
	const char		*	password,
	const char		*	auth_method
	)
{
	EBookBackendZimbra					*	ebz;
	EBookBackendZimbraPrivate			*	priv;
	ESource								*	source;
	char								*	id;
	int										status;
	gboolean								is_writable;
	GNOME_Evolution_Addressbook_CallStatus	err	= GNOME_Evolution_Addressbook_Success;

Log( "in %s\n", __FUNCTION__ );

	ebz		= E_BOOK_BACKEND_ZIMBRA( backend );
	zimbra_check( ebz, exit, err = GNOME_Evolution_Addressbook_AuthenticationFailed );

	priv	= ebz->priv;
	zimbra_check( priv, exit, err = GNOME_Evolution_Addressbook_AuthenticationFailed );

	source = e_book_backend_get_source( backend );
	zimbra_check( source, exit, err = GNOME_Evolution_Addressbook_AuthenticationFailed );

	if ( !ebz->priv->username )
	{
		ebz->priv->username = g_strdup( username );
	}

	if ( !ebz->priv->password )
	{
		ebz->priv->password = g_strdup( password );
	}

	switch (ebz->priv->mode)
	{
		case GNOME_Evolution_Addressbook_MODE_LOCAL:
		{
Log( "mode is local!\n" );
			// load summary file for offline use

			e_book_backend_summary_load( priv->summary );

				ebz->priv->is_writable = TRUE;
			e_book_backend_set_is_writable( backend, ebz->priv->is_writable );
			e_book_backend_notify_writable( backend, TRUE );

			e_book_backend_notify_connection_status( backend, FALSE ); 

			err = GNOME_Evolution_Addressbook_Success;
		}
		break;
		
		case GNOME_Evolution_Addressbook_MODE_REMOTE:
		{
			gboolean register_client = FALSE;
Log( "mode is remote!\n" );

			// We have already authenticated to server

			if ( !priv->cnc )
			{ 
Log( "making a new connection" );

				priv->cnc = e_zimbra_connection_new( source, username, password );

				if ( !E_IS_ZIMBRA_CONNECTION( priv->cnc ) )
				{
					err = GNOME_Evolution_Addressbook_AuthenticationFailed;
					goto exit;
				}

				register_client = TRUE;
			}
		
			id			= NULL;
			is_writable = TRUE;

			if ( !priv->folder_id )
			{
				priv->folder_id	= g_strdup( e_source_get_property( source, "id" ) );
			}

			if ( !priv->folder_id )
			{
				status = e_zimbra_connection_create_folder( priv->cnc, "1", e_book_backend_get_source( E_BOOK_BACKEND( ebz ) ), E_ZIMBRA_FOLDER_TYPE_CONTACTS, &priv->folder_id );

				if ( status != E_ZIMBRA_CONNECTION_STATUS_OK )
				{
					err = GNOME_Evolution_Addressbook_OtherError;
					goto exit;
				}

				ebz->priv->is_writable = TRUE;

				e_book_backend_set_is_writable( backend, ebz->priv->is_writable );
				e_book_backend_notify_writable( backend, ebz->priv->is_writable );
				e_book_backend_notify_connection_status( backend, TRUE );

				e_source_set_property( source, "id", priv->folder_id );
			}

			if ( register_client )
			{
				gboolean ok;
				
				ok = e_zimbra_connection_register_client( ebz->priv->cnc, ebz->priv->folder_id, ( gpointer ) ebz, sync_changes );
				zimbra_check( ok, exit, err = GNOME_Evolution_Addressbook_OtherError );
			}

			if ( !ebz->priv->cnc )
			{
				go_online( ebz );
			}
		}
		break;

		default :
		{
		}
		break;
	}

exit:

	e_data_book_respond_authenticate_user( book, opid, err );
}


static void
e_book_backend_zimbra_get_required_fields (EBookBackend *backend,
					       EDataBook    *book,
					       guint32       opid)
{
	GList *fields = NULL;

Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_get_required_fields...\n");
  
	fields = g_list_append (fields, (char *)e_contact_field_name (E_CONTACT_FILE_AS));
	e_data_book_respond_get_supported_fields (book, opid,
						  GNOME_Evolution_Addressbook_Success,
						  fields);
	g_list_free (fields);
}


static void
e_book_backend_zimbra_get_supported_fields
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32       		opid
	)
{
	GList	*	fields = NULL;
	int			i;

Log( "in %s\n", __FUNCTION__ );

	if ( enable_debug )
	{
		Log( "\ne_book_backend_zimbra_get_supported_fields...\n" );
	}

	for ( i = 0; i < g_num_mappings ; i++ )
	{
		fields = g_list_append( fields, g_strdup( e_contact_field_name( g_mappings[i].field_id ) ) );
	}

	fields = g_list_append( fields, g_strdup( e_contact_field_name( E_CONTACT_EMAIL_2 ) ) );
	fields = g_list_append( fields, g_strdup( e_contact_field_name( E_CONTACT_EMAIL_3 ) ) );
	fields = g_list_append( fields, g_strdup( e_contact_field_name( E_CONTACT_ADDRESS_WORK ) ) );

	e_data_book_respond_get_supported_fields( book, opid, GNOME_Evolution_Addressbook_Success, fields );
	g_list_free( fields );
}


static GNOME_Evolution_Addressbook_CallStatus
e_book_backend_zimbra_cancel_operation
	(
	EBookBackend	*	backend,
	EDataBook		*	book
	)
{
Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_cancel_operation...\n");
	return GNOME_Evolution_Addressbook_CouldNotCancel;
}


static GNOME_Evolution_Addressbook_CallStatus
e_book_backend_zimbra_load_source
	(
	EBookBackend	*	backend,
	ESource			*	source,
	gboolean			only_if_exists
	)
{
	EBookBackendZimbra					*	ebz;
	EBookBackendZimbraPrivate			*	priv;
	char								*	uri			= NULL;
	const char							*	book_name;
	const char							*	id;
	EUri								*	parsed_uri	= NULL;
	const char							*	use_ssl;
	char									filename[ 256 ];
	int										i;
	GNOME_Evolution_Addressbook_CallStatus	err;

Log( "in %s\n", __FUNCTION__ );

	if (enable_debug)
		Log("\ne_book_backend_zimbra_load_source.. \n");
	ebz = E_BOOK_BACKEND_ZIMBRA( backend );
	priv = ebz->priv;
	g_object_ref (source);

	priv->marked_for_offline = TRUE;

	if ( ( id = e_source_get_property( source, "id" ) ) != NULL )
	{
		priv->folder_id	= g_strdup( id );
	}

	if ( !priv->original_uri )
	{
		uri = e_source_get_uri( source );
		zimbra_check( uri, exit, err = GNOME_Evolution_Addressbook_OtherError );

Log( "uri = %s\n", uri );

		priv->original_uri = g_strdup( uri );
	}

	book_name = e_source_peek_name( source );
	zimbra_check( book_name, exit, err = GNOME_Evolution_Addressbook_OtherError );

	parsed_uri = e_uri_new( uri );
	zimbra_check( parsed_uri, exit, err = GNOME_Evolution_Addressbook_OtherError );

	if ( ( use_ssl = e_source_get_property( source, "use_ssl" ) ) && ( !g_str_equal( use_ssl, "never" ) ) )
	{
		priv->uri = g_strdup_printf( "https://%s:%d/service/soap", ( const char* ) parsed_uri->host, parsed_uri->port );
	}
	else 
	{
		priv->uri = g_strdup_printf( "http://%s:%d/service/soap", parsed_uri->host, parsed_uri->port );
	}

	priv->use_ssl			= g_strdup (use_ssl);
	priv->only_if_exists	= only_if_exists;
	
Log( "Yo 2: %s\n", priv->uri );

	priv->book_name = g_strdup( book_name );
	e_book_backend_set_is_loaded(E_BOOK_BACKEND (backend), TRUE);
	e_book_backend_set_is_writable(E_BOOK_BACKEND(backend), TRUE);  

	if ( priv->mode == GNOME_Evolution_Addressbook_MODE_LOCAL )
	{
		e_book_backend_notify_writable( backend, TRUE );
		e_book_backend_notify_connection_status( backend, FALSE ); 
	}
	else
	{
		e_book_backend_notify_connection_status( backend, TRUE );
	}
	
	for ( i = 0; i < strlen (uri); i++ )
	{
		switch (uri[i])
		{
			case ':' :
			case '/' :
				uri[i] = '_';
		}
	}

	priv->cache = e_book_backend_cache_new( priv->original_uri );
	zimbra_check( priv->cache, exit, err = GNOME_Evolution_Addressbook_OtherError );

	if ( priv->summary_file_name )
	{
		g_free( priv->summary_file_name );
	}

	snprintf( filename, sizeof( filename ), "%s.summary", priv->book_name );
	priv->summary_file_name = g_build_filename( g_get_home_dir(), ".evolution/addressbook", uri, filename, NULL );
	zimbra_check( priv->summary_file_name, exit, err = GNOME_Evolution_Addressbook_OtherError );
	e_util_mkdir_hier( g_path_get_dirname( priv->summary_file_name ), 0700 );
	g_unlink( priv->summary_file_name );
	priv->summary = e_book_backend_summary_new( priv->summary_file_name, SUMMARY_FLUSH_TIMEOUT );
	zimbra_check( priv->summary, exit, err = GNOME_Evolution_Addressbook_OtherError );
	build_summary( ebz->priv );

	if (enable_debug) {
		Log("summary file name = %s\ncache file name = %s \n", 
			 priv->summary_file_name, e_file_cache_get_filename (E_FILE_CACHE(priv->cache)));
	}

Log( "returning success!\n ");
	err = GNOME_Evolution_Addressbook_Success;

exit:

	if ( uri )
	{
		g_free( uri );
	}

	if ( parsed_uri )
	{
		e_uri_free( parsed_uri );
	}

	return err;
}


static void
e_book_backend_zimbra_remove
	(
	EBookBackend	*	backend,
	EDataBook		*	book,
	guint32				opid
	)
{
	EBookBackendZimbra	*	ebz;
	int						status;
  
Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_remove...\n");
	ebz = E_BOOK_BACKEND_ZIMBRA (backend);

	// Don't allow offline delete if we've already create folder on ZCS

	if ( ( ebz->priv->cnc == NULL ) && ( ebz->priv->folder_id ) )
	{
		e_data_book_respond_remove( book, opid, GNOME_Evolution_Addressbook_PermissionDenied );
		return;
	}

	// Don't allow delete if we're trying to delete the Contacts folder

	if ( ebz->priv->folder_id && g_str_equal( ebz->priv->folder_id, "7" ) )
	{
		e_data_book_respond_remove( book, opid, GNOME_Evolution_Addressbook_PermissionDenied );
		return;
	}

	if ( !ebz->priv->is_writable )
	{
fprintf( stderr, "isn't writable?\n" );
		e_data_book_respond_remove( book, opid, GNOME_Evolution_Addressbook_PermissionDenied );
		return;
	}

	if ( ebz->priv->folder_id )
	{
		status = e_zimbra_connection_delete_folder (ebz->priv->cnc, ebz->priv->folder_id );
	}
	else
	{
		status = E_ZIMBRA_CONNECTION_STATUS_OK;
	}

	if (status == E_ZIMBRA_CONNECTION_STATUS_OK) 
	{
fprintf( stderr, "remove folder worked\n" );
		e_data_book_respond_remove( book, opid, GNOME_Evolution_Addressbook_Success );
	}
	else
	{
fprintf( stderr, "remove folder didn't work\n" );
		e_data_book_respond_remove( book, opid, GNOME_Evolution_Addressbook_OtherError );
	}

	g_unlink (e_file_cache_get_filename (E_FILE_CACHE (ebz->priv->cache)));
}


static char *
e_book_backend_zimbra_get_static_capabilities (EBookBackend *backend)
{
	EBookBackendZimbra *ebz;

Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_get_static_capabilities...\n");
	
	ebz = E_BOOK_BACKEND_ZIMBRA (backend);

	// do-initialy-query is enabled for system address book also,
	// so that we get the book_view, which is needed for displaying
	// cache update progress. 
	// and null query is handled for system address book. 

	return g_strdup( "net,bulk-removes,do-initial-query,contact-lists" );
}


static void 
e_book_backend_zimbra_get_supported_auth_methods (EBookBackend *backend, EDataBook *book, guint32 opid)
{
	GList *auth_methods = NULL;
	char *auth_method;
	
Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_get_supported_auth_methods...\n");
	auth_method =  g_strdup_printf("plain/password");
	auth_methods = g_list_append (auth_methods, auth_method);
	e_data_book_respond_get_supported_auth_methods (book,
							opid,
							GNOME_Evolution_Addressbook_Success,
							auth_methods);  
	g_free (auth_method);
	g_list_free (auth_methods);
}


static void 
e_book_backend_zimbra_set_mode (EBookBackend *backend, int mode)
{
	EBookBackendZimbra *bg;
	
Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_set_mode...\n");
	bg = E_BOOK_BACKEND_ZIMBRA (backend);
	bg->priv->mode = mode;
	if (e_book_backend_is_loaded (backend)) {
		if (mode == GNOME_Evolution_Addressbook_MODE_LOCAL) {
			e_book_backend_notify_connection_status (backend, FALSE);
			if (bg->priv->cnc) {
				e_zimbra_connection_unregister_client( bg->priv->cnc, bg->priv->folder_id );
				g_object_unref (bg->priv->cnc);
				bg->priv->cnc=NULL;
			}
		}
		else if (mode == GNOME_Evolution_Addressbook_MODE_REMOTE) {
			if (bg->priv->is_writable)
				e_book_backend_notify_writable (backend, TRUE);
			else 
				e_book_backend_notify_writable (backend, FALSE);
			e_book_backend_notify_connection_status (backend, TRUE);
			e_book_backend_notify_auth_required (backend);
		}
	}
}

/**
 * e_book_backend_zimbra_new:
 */
EBookBackend *
e_book_backend_zimbra_new (void)
{
	EBookBackendZimbra *backend;

Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_new...\n");
                                                                                                                             
	backend = g_object_new( E_TYPE_BOOK_BACKEND_ZIMBRA, NULL );
                                                                                                       
	return E_BOOK_BACKEND( backend );
}


static void
e_book_backend_zimbra_dispose (GObject *object)
{
	EBookBackendZimbra * ebz;

Log( "in %s\n", __FUNCTION__ );
	if (enable_debug)
		Log("\ne_book_backend_zimbra_dispose...\n");
                                                                                                                             
	ebz = E_BOOK_BACKEND_ZIMBRA (object);
                                                                                                                             
	if (ebz->priv) {
		if (ebz->priv->uri) {
			g_free (ebz->priv->uri);
			ebz->priv->uri = NULL;
		}

		if (ebz->priv->original_uri) {
			g_free (ebz->priv->original_uri);
			ebz->priv->original_uri = NULL;
		}

		if (ebz->priv->cnc) {
			g_object_unref (ebz->priv->cnc);
			ebz->priv->cnc = NULL;
		}
		if (ebz->priv->folder_id) {
			g_free (ebz->priv->folder_id);
			ebz->priv->folder_id = NULL;
		}
		if (ebz->priv->book_name) {
			g_free (ebz->priv->book_name);
			ebz->priv->book_name = NULL;
		}
		if (ebz->priv->summary_file_name) {
			g_free (ebz->priv->summary_file_name);
			ebz->priv->summary_file_name = NULL;
		}
		if (ebz->priv->cache) {
			g_object_unref (ebz->priv->cache);
		}
		if (ebz->priv->summary) {
			e_book_backend_summary_save(ebz->priv->summary);
			g_object_unref (ebz->priv->summary);
			ebz->priv->summary = NULL;
		}
		if (ebz->priv->use_ssl) {
			g_free (ebz->priv->use_ssl);
		}
		if (ebz->priv->cache_timeout) {
			g_source_remove (ebz->priv->cache_timeout);
			ebz->priv->cache_timeout = 0;
		}
		if (ebz->priv->update_mutex)
			g_mutex_free(ebz->priv->update_mutex);
		
		g_free (ebz->priv);
		ebz->priv = NULL;
	}

	G_OBJECT_CLASS (e_book_backend_zimbra_parent_class)->dispose (object);
}
                                                                                                                            

static void
e_book_backend_zimbra_class_init (EBookBackendZimbraClass *klass)
{
	GObjectClass		* object_class = G_OBJECT_CLASS( klass );
	EBookBackendClass	* parent_class;

Log( "in %s\n", __FUNCTION__ );

	e_book_backend_zimbra_parent_class			= g_type_class_peek_parent (klass);

	parent_class								= E_BOOK_BACKEND_CLASS (klass);

	// Set the virtual methods.

	parent_class->load_source					= e_book_backend_zimbra_load_source;
	parent_class->get_static_capabilities		= e_book_backend_zimbra_get_static_capabilities;
	parent_class->create_contact				= e_book_backend_zimbra_create_contact;
	parent_class->remove_contacts				= e_book_backend_zimbra_remove_contacts;
	parent_class->modify_contact				= e_book_backend_zimbra_modify_contact;
	parent_class->get_contact					= e_book_backend_zimbra_get_contact;
	parent_class->get_contact_list				= e_book_backend_zimbra_get_contact_list;
	parent_class->start_book_view				= e_book_backend_zimbra_start_book_view;
	parent_class->stop_book_view				= e_book_backend_zimbra_stop_book_view;
	parent_class->get_changes					= e_book_backend_zimbra_get_changes;
	parent_class->authenticate_user				= e_book_backend_zimbra_authenticate_user;
	parent_class->get_required_fields			= e_book_backend_zimbra_get_required_fields;
	parent_class->get_supported_fields			= e_book_backend_zimbra_get_supported_fields;
	parent_class->get_supported_auth_methods	= e_book_backend_zimbra_get_supported_auth_methods;
	parent_class->cancel_operation				= e_book_backend_zimbra_cancel_operation;
	parent_class->remove						= e_book_backend_zimbra_remove;
	parent_class->set_mode						= e_book_backend_zimbra_set_mode;
	object_class->dispose						= e_book_backend_zimbra_dispose;
}


static void
e_book_backend_zimbra_init (EBookBackendZimbra *backend)
{
	EBookBackendZimbraPrivate *priv;

Log( "in %s\n", __FUNCTION__ );

	priv						= g_new0 (EBookBackendZimbraPrivate, 1);
	priv->is_writable			= TRUE;
	priv->is_cache_ready		= FALSE;
	priv->is_summary_ready		= FALSE;
	priv->marked_for_offline	= FALSE;
	priv->use_ssl				= NULL;
	priv->cache					= NULL;
	priv->cnc					= NULL;
	priv->original_uri			= NULL;
	priv->cache_timeout			= 0;
	priv->update_mutex			= g_mutex_new();
	priv->reserved1				= NULL;
	priv->reserved2				= NULL;
	priv->reserved3				= NULL;

	backend->priv = priv;

	if ( g_getenv ("ZIMBRA_DEBUG" ) )
	{ 
		if (atoi (g_getenv ("ZIMBRA_DEBUG")) == 2)
			enable_debug = TRUE;
		else
			enable_debug = FALSE;
	}
}


/**
 * e_book_backend_zimbra_get_type:
 */
GType
e_book_backend_zimbra_get_type (void)
{
	static GType type = 0;
Log( "in %s\n", __FUNCTION__ );

	if ( !type)
	{
		GTypeInfo info =
		{
			sizeof (EBookBackendZimbraClass),
			NULL,												// base_class_init
			NULL,												// base_class_finalize
			(GClassInitFunc) e_book_backend_zimbra_class_init,
			NULL,												// class_finalize
			NULL,												// class_data
			sizeof (EBookBackendZimbra),
			0,													// n_preallocs
			(GInstanceInitFunc) e_book_backend_zimbra_init
		};

		type = g_type_register_static (E_TYPE_BOOK_BACKEND, "EBookBackendZimbra", &info, 0);
	}

	return type;
}
