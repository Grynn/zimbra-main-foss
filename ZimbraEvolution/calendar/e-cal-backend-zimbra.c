/* -*- Mode: C; tab-width: 4; indent-tabs-mode: t; c-basic-offset: 8 -*- */
/* 
 * Copyright 2006, Zimbra, Inc.
 *
 * This program is free software; you can redistribute it and/or 
 * modify it under the terms of version 2 of the GNU Lesser General Public 
 * License as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 * USA
 *
 * Authors : 
 *  Scott Herscher <scott.herscher@zimbra.com>
 *
 */

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <glib/gstdio.h>
#include <glib/gi18n-lib.h>
#include <libgnomevfs/gnome-vfs-uri.h>
#include <libgnomevfs/gnome-vfs.h>
#include <libedataserver/e-xml-hash-utils.h>
#include <libedataserver/e-url.h>
#include <libedataserver/e-source-list.h>
#include <libedataserver/e-source-group.h>
#include <libedataserver/e-source.h>
#include <libedata-cal/e-cal-backend-cache.h>
#include <libedata-cal/e-cal-backend-util.h>
#include <libecal/e-cal-component.h>
#include <libecal/e-cal-time-util.h>
#include "e-cal-backend-zimbra.h"
#include "e-cal-backend-zimbra-utils.h"
#include <libezimbra/e-zimbra-connection.h>
#include <libezimbra/e-zimbra-folder.h>
#include <libezimbra/e-zimbra-utils.h>
#include <libezimbra/e-zimbra-debug.h>

#ifndef O_BINARY
#define O_BINARY 0
#endif

#define SYNC_RATE_MAX 5

/* Private part of the CalBackendZimbra structure */
struct _ECalBackendZimbraPrivate
{
	/* A mutex to control access to the private structure */
	GMutex *mutex;
	EZimbraConnection *cnc;
	ECalBackendCache *cache;
	gboolean read_only;
	char *folder_id;
	char *uri;
	char * account;
	char *username;
	char *password;
	CalMode mode;
	gboolean mode_changed;
	icaltimezone *default_zone;
	GHashTable *categories_by_id;
	GHashTable *categories_by_name;

	/* number of calendar items in the folder */
	guint32 total_count;
	
	/* fields for storing info while offline */
	char *user_email;
	char *local_attachments_store;
};


static ECalComponent*
get_main_component
	(
	ECalBackendZimbra	*	cbz,
	const char			*	uid
	);


static ECalBackendSyncStatus
e_cal_backend_zimbra_get_object
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	const char		*	uid,
	const char		*	rid,
	char			**	object
	);


static EZimbraConnectionStatus
sync_changes
	(
	gpointer				handle,
	const char			*	name,
	GList				*	updates,
	GList				*	deletes
	);


static icalproperty*
get_zimbra_item_property
	(
	icalcomponent	*	icalcomp,
	const char		*	prop_name
	);


static const char *
get_zimbra_item_data
	(
	icalcomponent	*	icalcomp,
	const char		*	prop_name
	);


static void e_cal_backend_zimbra_dispose (GObject *object);
static void e_cal_backend_zimbra_finalize (GObject *object);

static void update_component
	(
	ECalBackendZimbra	*	cbz,
	ECalComponent		*	comp,
	char				*	id
	);


static ECalBackendSyncStatus
e_cal_backend_zimbra_add_timezone (ECalBackendSync *backend, EDataCal *cal, const char *tzobj);

#define PARENT_TYPE E_TYPE_CAL_BACKEND_SYNC
static ECalBackendClass *parent_class = NULL;

/* Time interval in milliseconds for obtaining changes from server and refresh the cache. */

#define CACHE_REFRESH_INTERVAL 10000
#define CURSOR_ITEM_LIMIT 100
#define CURSOR_ICALID_LIMIT 500

EZimbraConnection *
e_cal_backend_zimbra_get_connection (ECalBackendZimbra *cbz)
{
	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), NULL);

	return cbz->priv->cnc;
}


icaltimezone*
e_cal_backend_zimbra_get_zone( ECalBackendZimbra * cbz, const char *tzid )
{
	icaltimezone * zone = NULL;

	if ( !strcmp( tzid, "UTC" ) )
	{
		zone = icaltimezone_get_utc_timezone();
	}
	else
	{
		zone = icaltimezone_get_builtin_timezone_from_tzid( tzid );

		if ( !zone )
		{
			zone = ( icaltimezone* )e_cal_backend_cache_get_timezone( cbz->priv->cache, tzid );
		}
	}

	return zone;
}

GHashTable *
e_cal_backend_zimbra_get_categories_by_id (ECalBackendZimbra *cbz)
{
	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), NULL);
	
	return cbz->priv->categories_by_id;
}

GHashTable *
e_cal_backend_zimbra_get_categories_by_name (ECalBackendZimbra *cbz) {

	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), NULL);

	return cbz->priv->categories_by_name;
}

icaltimezone *
e_cal_backend_zimbra_get_default_zone (ECalBackendZimbra *cbz)
{
	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), NULL);

	return cbz->priv->default_zone;
}


static gboolean
send_update
	(
	ECalBackendZimbra	*	cbz,
	const char			*	icalid
	)
{
	GSList				*	components	=	NULL;
	EZimbraItem			*	item		=	NULL;
	const char			*	id			=	NULL;
	char				*	new_id		=	NULL;
	EZimbraConnectionStatus	err			=	0;

	// If we can't find this guy in our cache, we got problems

	if ( ( components = e_cal_backend_cache_get_components_by_uid( cbz->priv->cache, icalid ) ) != NULL )
	{
		// Convert it to an EZimbraItem

		item = e_zimbra_item_new_from_cal_components( cbz->priv->folder_id, cbz, components );
		zimbra_check( item, exit, err = E_ZIMBRA_CONNECTION_STATUS_UNKNOWN );

		// Retrieve the id.  If we don't have one, then we're creating this item

		if ( ( id = e_zimbra_item_get_id( item ) ) != NULL )
		{
			err = e_zimbra_connection_modify_item( cbz->priv->cnc, item, id );
	
			if ( err == E_ZIMBRA_CONNECTION_STATUS_INVALID_CONNECTION )
			{
				err = e_zimbra_connection_modify_item( cbz->priv->cnc, item, id );
			}
		}
		else
		{
			err = e_zimbra_connection_create_item( cbz->priv->cnc, item, &new_id );
	
			if ( err == E_ZIMBRA_CONNECTION_STATUS_INVALID_CONNECTION )
			{
				err = e_zimbra_connection_create_item( cbz->priv->cnc, item, &new_id );
			}

			if ( err == E_ZIMBRA_CONNECTION_STATUS_OK )
			{
fprintf( stderr, "new_id = %s\n", new_id );
				update_component( cbz, E_CAL_COMPONENT( components->data ), new_id );
			}
		}
	
		zimbra_check_okay( err, exit );
	}

exit:

	if ( new_id )
	{
		g_free( new_id );
	}

	if ( item )
	{
		g_object_unref( item );
	}

	if ( components )
	{
		g_slist_foreach( components, ( GFunc ) g_object_unref, NULL );
		g_slist_free( components );
	}

	return ( !err ) ? TRUE : FALSE;
}


static gboolean
send_remove
	(
	ECalBackendZimbra	*	cbz,
	const char			*	id_to_remove
	)
{
	EZimbraConnectionStatus err;

	err = e_zimbra_connection_remove_item( cbz->priv->cnc, cbz->priv->folder_id, E_ZIMBRA_ITEM_TYPE_APPOINTMENT, id_to_remove );

	if ( err == E_ZIMBRA_CONNECTION_STATUS_INVALID_CONNECTION )
	{
		err = e_zimbra_connection_remove_item( cbz->priv->cnc, cbz->priv->folder_id, E_ZIMBRA_ITEM_TYPE_APPOINTMENT, id_to_remove );
	}

	return ( ( err == E_ZIMBRA_CONNECTION_STATUS_OK ) || ( err == E_ZIMBRA_CONNECTION_STATUS_NO_SUCH_ITEM ) ) ? TRUE : FALSE;
}


static void
add_component
	(
	ECalBackendZimbra	*	cbz,
	ECalComponent		*	comp
	)
{
	char * comp_str;

	e_cal_backend_cache_put_component( cbz->priv->cache, comp );

	comp_str = e_cal_component_get_as_string( comp );

	e_cal_backend_notify_object_created( E_CAL_BACKEND( cbz ), (const char*) comp_str );
					
	g_free (comp_str);
}


static void
remove_components
	(
	ECalBackendZimbra	*	cbz,
	const char			*	icalid
	)
{
	GSList	*	components;
	GSList	*	l;

	components = e_cal_backend_cache_get_components_by_uid( cbz->priv->cache, icalid );

	for ( l = components; l; l = g_slist_next( l ) )
	{
		ECalComponent	*	comp = E_CAL_COMPONENT( l->data );
		char			*	comp_str;
		ECalComponentId *	comp_id;
	
		comp_str	= e_cal_component_get_as_string( comp );
		comp_id		= e_cal_component_get_id( comp );

		e_cal_backend_cache_remove_component( cbz->priv->cache, comp_id->uid, comp_id->rid );

		e_cal_backend_notify_object_removed( E_CAL_BACKEND( cbz ), comp_id, comp_str, NULL );

		e_cal_component_free_id( comp_id );
		g_free( comp_str );
	}

	if ( components )
	{
		g_slist_foreach( components, ( GFunc ) g_object_unref, NULL );
		g_slist_free( components );
	}
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
	ECalBackendZimbra			*	cbz			= NULL;
	ECalBackendZimbraPrivate	*	priv		= NULL;
	EZimbraConnection			*	cnc			= NULL;
	ECalBackendCache			*	cache		= NULL;
	icalcomponent_kind				kind;
	GPtrArray					*	our_updates	= NULL;
	GPtrArray					*	our_deletes	= NULL;
	const char					*	icalid		= NULL;
	const icaltimetype			*	itt			= NULL;
	char						*	id			= NULL;
	GList 						*	l			= NULL;
	EZimbraItem					*	item		= NULL;
	gboolean						frozen		= FALSE;
	int								i;
	gboolean						ret			= TRUE;

fprintf( stderr, "in %s\n", __FUNCTION__ );

	zimbra_check( handle, exit, ret = FALSE );

	cbz		= ( ECalBackendZimbra* ) handle;
	priv	= cbz->priv;

	zimbra_check( priv->mode == CAL_MODE_REMOTE, exit, ret = FALSE );

	kind	= e_cal_backend_get_kind( E_CAL_BACKEND( cbz ) );
	cnc		= priv->cnc; 
	cache	= priv->cache; 

	e_file_cache_freeze_changes( E_FILE_CACHE( cache ) );
	frozen = TRUE;

	// Pull changes from ZCS

fprintf( stderr, "***** there are %d updates\n", g_list_length( updates ) );

	for ( l = updates, i = 0; l; l = l->next, i++ )
	{
		float				percent;

		item = E_ZIMBRA_ITEM( l->data );

		if ( !item )
		{
			g_warning( "couldn't create item!" );
		}

		// Let's do some checking here

		icalid = e_zimbra_item_get_icalid( item );

		if ( !icalid )
		{
			g_warning( "item with no icalid" );
			continue;
		}

		// 1. Is this item in our list of updates?  If so, that means we have a conflict

		if ( !e_zimbra_utils_find_cache_string( E_FILE_CACHE( cbz->priv->cache ), "update", icalid ) )
		{
			GSList	*	components;
			GSList	*	l;

			// Show the progress information

			percent = ( ( float ) i / g_list_length( updates ) ) * 100;
		
			e_cal_backend_notify_view_progress( E_CAL_BACKEND( cbz ), _( "Loading Calendar items" ), percent );

			// Oy...this is brute force. Get rid of all the components in the cache

			remove_components( cbz, icalid );

			// Make sure we put the timezone in the cache

			itt = e_zimbra_item_get_start_date( item );

			if ( !icaltime_is_utc( *itt ) && itt->zone )
			{
				if ( !e_cal_backend_cache_get_timezone( cbz->priv->cache, icaltimezone_get_tzid( ( icaltimezone* ) itt->zone ) ) )
				{
					e_cal_backend_cache_put_timezone( cbz->priv->cache, itt->zone );
				}
			}

			// And put back in the new ones

			components = e_zimbra_item_to_cal_components( item, cbz );

			for ( l = components; l != NULL; l = l->next )
			{
				ECalComponent * comp = E_CAL_COMPONENT( l->data );

				if ( E_IS_CAL_COMPONENT( comp ) && ( kind == icalcomponent_isa( e_cal_component_get_icalcomponent( comp ) ) ) )
				{
					add_component( cbz, comp );
				}
			}

			if ( components )
			{
				g_slist_foreach( components, ( GFunc ) g_object_unref, NULL );
				g_slist_free( components );
			}
		}
		else
		{
			g_warning( "******** CONFLICT DETECTED ***********" );
		}
	}

	// Go through deletes

fprintf( stderr, "***** there are %d deletes\n", g_list_length( deletes ) );

	for ( l = deletes; l; l = l->next )
	{
		GList * components;

		id = ( char* ) ( l->data );

		if ( ( components = e_cal_backend_cache_get_components( cbz->priv->cache ) ) != NULL )
		{
			GList * cl;

			for ( cl = components; cl; cl = cl->next )
			{
				ECalComponent	*	comp;
				const char		*	victim_appt_id;

				comp = E_CAL_COMPONENT( cl->data );

				victim_appt_id = get_zimbra_item_data( e_cal_component_get_icalcomponent( comp ), ZIMBRA_X_APPT_ID );

				if ( victim_appt_id && g_str_equal( id, victim_appt_id ) )
				{
					ECalComponentId * comp_id;

					comp_id = e_cal_component_get_id( comp );

					e_cal_backend_cache_remove_component( priv->cache, comp_id->uid, comp_id->rid );

					if ( !comp_id->rid )
					{
						e_cal_backend_notify_object_removed(E_CAL_BACKEND (cbz), comp_id, e_cal_component_get_as_string( comp ), NULL );
					}

					e_cal_component_free_id( comp_id );
				}
			}

			// Clean up the list

			g_list_foreach( components, ( GFunc ) g_object_unref, NULL );
			g_list_free( components );
		}
	}

	// Push changes to ZCS

	if ( ( our_updates = e_zimbra_utils_get_cache_array( E_FILE_CACHE( cbz->priv->cache ), "update" ) ) != NULL )
	{
		for ( i = 0; i < our_updates->len; i++ )
		{
			const char * icalid = g_ptr_array_index( our_updates, i );

			if ( send_update( cbz, icalid ) )
			{
				e_zimbra_utils_del_cache_string( E_FILE_CACHE( cbz->priv->cache ), "update", icalid );
			}
		}

		g_ptr_array_foreach( our_updates, ( GFunc ) g_free, NULL );
		g_ptr_array_free( our_updates, TRUE );
	}

	// Sync up our deletes with ZCS

	if ( ( our_deletes = e_zimbra_utils_get_cache_array( E_FILE_CACHE( cbz->priv->cache ), "delete" ) ) != NULL )
	{
		for ( i = 0; i < our_deletes->len; i++ )
		{
			const char * appt_id = g_ptr_array_index( our_deletes, i );

			if ( send_remove( cbz, appt_id ) )
			{
				e_zimbra_utils_del_cache_string( E_FILE_CACHE( cbz->priv->cache ), "delete", appt_id );
			}
		}

		g_ptr_array_foreach( our_deletes, ( GFunc ) g_free, NULL );
		g_ptr_array_free( our_deletes, TRUE );
	}

	e_cal_backend_notify_view_done( E_CAL_BACKEND (cbz), GNOME_Evolution_Calendar_Success );

exit:

	if ( frozen )
	{
		e_file_cache_thaw_changes( E_FILE_CACHE( cache ) );
	}

	return ret;        
}


/* Dispose handler for the file backend */
static void
e_cal_backend_zimbra_dispose (GObject *object)
{
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;

	cbz = E_CAL_BACKEND_ZIMBRA (object);
	priv = cbz->priv;

fprintf( stderr, "in zimbra_dispose!!!\n" );

	if (G_OBJECT_CLASS (parent_class)->dispose)
		(* G_OBJECT_CLASS (parent_class)->dispose) (object);
}

/* Finalize handler for the file backend */
static void
e_cal_backend_zimbra_finalize (GObject *object)
{
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;

	g_return_if_fail (object != NULL);
	g_return_if_fail (E_IS_CAL_BACKEND_ZIMBRA (object));

	cbz = E_CAL_BACKEND_ZIMBRA (object);
	priv = cbz->priv;

fprintf( stderr, "in zimbra_finalize!!!\n" );

	/* Clean up */
	if (priv->mutex) {
		g_mutex_free (priv->mutex);
		priv->mutex = NULL;
	}

	if (priv->cnc) {
		g_object_unref (priv->cnc);
		priv->cnc = NULL;
	}

	if (priv->cache) {
		g_object_unref (priv->cache);
		priv->cache = NULL;
	}

	if ( priv->account )
	{
		g_free( priv->account );
		priv->account = NULL;
	}

	if (priv->username) {
		g_free (priv->username);
		priv->username = NULL;
	}

	if (priv->password) {
		g_free (priv->password);
		priv->password = NULL;
	}

	if (priv->folder_id) {
		g_free (priv->folder_id);
		priv->folder_id = NULL;
	}

	if (priv->user_email) {
		g_free (priv->user_email);
		priv->user_email = NULL;
	}

	if (priv->local_attachments_store) {
		g_free (priv->local_attachments_store);
		priv->local_attachments_store = NULL;
	}

	g_free (priv);
	cbz->priv = NULL;

	if (G_OBJECT_CLASS (parent_class)->finalize)
		(* G_OBJECT_CLASS (parent_class)->finalize) (object);
}

/* Calendar backend methods */

/* Is_read_only handler for the file backend */
static ECalBackendSyncStatus
e_cal_backend_zimbra_is_read_only (ECalBackendSync *backend, EDataCal *cal, gboolean *read_only)
{
	ECalBackendZimbra *cbz;
	
	cbz = E_CAL_BACKEND_ZIMBRA(backend);
	*read_only = cbz->priv->read_only;
	
	return GNOME_Evolution_Calendar_Success;
}

/* return email address of the person who opened the calender */
static ECalBackendSyncStatus
e_cal_backend_zimbra_get_cal_address (ECalBackendSync *backend, EDataCal *cal, char **address)
{
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;
	
	cbz = E_CAL_BACKEND_ZIMBRA(backend);
	priv = cbz->priv;

	if (priv->mode == CAL_MODE_REMOTE) {
		if (priv->user_email)
			g_free (priv->user_email);

		priv->user_email = g_strdup (e_zimbra_connection_get_user_email (cbz->priv->cnc));
	}

	*address = g_strdup (priv->user_email);
	
	return GNOME_Evolution_Calendar_Success;
}

static ECalBackendSyncStatus
e_cal_backend_zimbra_get_ldap_attribute (ECalBackendSync *backend, EDataCal *cal, char **attribute)
{
	/* ldap attribute is specific to Sun ONE connector to get free busy information*/
	
	*attribute = NULL;
	
	return GNOME_Evolution_Calendar_Success;
}

static ECalBackendSyncStatus
e_cal_backend_zimbra_get_alarm_email_address (ECalBackendSync *backend, EDataCal *cal, char **address)
{
	*address = NULL;
	
	return GNOME_Evolution_Calendar_Success;
}

static ECalBackendSyncStatus
e_cal_backend_zimbra_get_static_capabilities (ECalBackendSync *backend, EDataCal *cal, char **capabilities)
{
	*capabilities = g_strdup
			(
			CAL_STATIC_CAPABILITY_ORGANIZER_MUST_ATTEND ","
			CAL_STATIC_CAPABILITY_NO_EMAIL_ALARMS ","
			CAL_STATIC_CAPABILITY_REMOVE_ALARMS ","
			CAL_STATIC_CAPABILITY_NO_THISANDPRIOR ","
/*
			CAL_STATIC_CAPABILITY_SAVE_SCHEDULES ","
*/
			CAL_STATIC_CAPABILITY_NO_THISANDFUTURE
			);

	return GNOME_Evolution_Calendar_Success;
}


static ECalBackendSyncStatus
go_offline
	(
	ECalBackendZimbra * cbz
	)
{
fprintf( stderr, "in go_offline!!!!\n" );

	if ( cbz->priv->cnc )
	{
		e_zimbra_connection_unregister_client( cbz->priv->cnc, cbz->priv->folder_id );
		g_object_unref( cbz->priv->cnc );
		cbz->priv->cnc = NULL;
	}

	return GNOME_Evolution_Calendar_Success;
}


static ECalBackendSyncStatus
go_online
	(
	ECalBackendZimbra	*	cbz,
	ESource				*	source,
	gboolean				only_if_exists
	)
{
	ECalBackendZimbraPrivate	*	priv	=	NULL;
	EZimbraFolder				*	folder	=	NULL;
	gboolean						ok		=	TRUE;
	char						*	msg		=	NULL;
	ECalBackendSyncStatus			err		=	0;

fprintf( stderr, "in go_online\n" );

	priv = cbz->priv;
	zimbra_check( priv->folder_id || !only_if_exists, exit, err = GNOME_Evolution_Calendar_AuthenticationFailed );

	// Create connection to ZCS

	priv->cnc = e_zimbra_connection_new( source, priv->username, priv->password );
	zimbra_check( E_IS_ZIMBRA_CONNECTION( priv->cnc ), exit,  err = GNOME_Evolution_Calendar_AuthenticationFailed; msg = _("Authentication failed" ) );

	// Check to see if we just created this folder

	if ( !priv->folder_id )
	{
		EZimbraConnectionStatus status;

		status = e_zimbra_connection_create_folder( priv->cnc, "1", source, E_ZIMBRA_FOLDER_TYPE_CALENDAR, &priv->folder_id );
		zimbra_check( status == E_ZIMBRA_CONNECTION_STATUS_OK, exit, err = GNOME_Evolution_Calendar_OtherError );

		e_source_set_property( source, "id", priv->folder_id );

		cbz->priv->read_only	= FALSE;
		priv->mode_changed		= FALSE;
		priv->total_count		= 0;
		priv->mode				= CAL_MODE_REMOTE;
	}
	else
	{
		folder = e_zimbra_connection_peek_folder_by_id( priv->cnc, priv->folder_id );
		zimbra_check( folder, exit,  err = GNOME_Evolution_Calendar_OtherError; msg = _("Unknown Error" ) );

		cbz->priv->read_only	= ( e_zimbra_folder_get_permissions( folder ) & E_ZIMBRA_FOLDER_PERMISSIONS_WRITE ) == 0 ? TRUE : FALSE;
		priv->mode_changed		= FALSE;
		priv->total_count		= e_zimbra_folder_get_total_count( folder );
		priv->mode				= CAL_MODE_REMOTE;
	}

	ok = e_zimbra_connection_register_client( cbz->priv->cnc, cbz->priv->folder_id, ( gpointer ) cbz, sync_changes );
	zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_OtherError );

	e_zimbra_connection_sync( cbz->priv->cnc );

	err = GNOME_Evolution_Calendar_Success;

exit:

	if ( err && msg )
	{
		e_cal_backend_notify_error( E_CAL_BACKEND( cbz ), msg );
	}

	return err;
}

/* Open handler for the file backend */

static ECalBackendSyncStatus
e_cal_backend_zimbra_open
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	gboolean			only_if_exists,
	const char		*	username,
	const char		*	password
	)
{
	ECalBackendZimbra			*	cbz				= NULL;
	ECalBackendZimbraPrivate	*	priv			= NULL;
	ESource						*	source			= NULL;
	GList						*	cache_items		= NULL;
	const char					*	msg				= NULL;
	ECalBackendSyncStatus			err				= 0;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	
	cbz		= E_CAL_BACKEND_ZIMBRA (backend);
	priv	= cbz->priv;
 
	g_mutex_lock( priv->mutex );

	// We need our ESource a lot

	source = e_cal_backend_get_source( E_CAL_BACKEND( cbz ) );
	zimbra_check( source, exit, err = GNOME_Evolution_Calendar_OtherError );

fprintf( stderr, "username = %s\n", username );
fprintf( stderr, "password = %s\n", password );

	// Initialize state

	if ( !priv->folder_id )
	{
		const char * folder_id;

		if ( ( folder_id = e_source_get_property( source, "id" ) ) != NULL )
		{
			priv->folder_id	= g_strdup( folder_id );
			zimbra_check( priv->folder_id, exit,  err = GNOME_Evolution_Calendar_OtherError; msg = _("Unknown error" ) );
		}
	}

	if ( !priv->account )
	{
		priv->account = g_strdup( e_source_get_property( source, "account" ) );
	}

	if ( !priv->username )
	{
		priv->username = g_strdup( username );
		zimbra_check( priv->username, exit, err = GNOME_Evolution_Calendar_OtherError );
	}

	if ( !priv->password  )
	{
		priv->password = g_strdup( password );
		zimbra_check( priv->username, exit, err = GNOME_Evolution_Calendar_OtherError );
	}

	cbz->priv->read_only = FALSE;

	// Create the cache

	if ( !cbz->priv->cache )
	{
		cbz->priv->cache = e_cal_backend_cache_new( e_cal_backend_get_uri( E_CAL_BACKEND( cbz ) ) );
		zimbra_check( cbz->priv->cache, exit, msg = _("Could not create cache file" ); err = GNOME_Evolution_Calendar_OtherError );

		e_cal_backend_cache_put_default_timezone( priv->cache, priv->default_zone );
		e_cal_backend_zimbra_add_timezone( E_CAL_BACKEND_SYNC( cbz ), NULL, ( const char* ) icaltimezone_get_tzid( priv->default_zone ) );
	}

	switch ( priv->mode )
	{
		case CAL_MODE_LOCAL:
		{
			const char * prop = NULL;
			
			cbz->priv->mode			= CAL_MODE_LOCAL;
			cbz->priv->read_only	= FALSE;				
			prop					= e_source_get_property( source, "offline_sync" );
			
			if ( !prop || !g_str_equal( prop, "1" ) )
			{
				err = GNOME_Evolution_Calendar_RepositoryOffline;
				goto exit;
			}
		}
		break;

		default:
		{
			if ( cbz->priv->cnc )
			{
				e_zimbra_connection_sync( cbz->priv->cnc );
			}
			else
			{
				err = go_online( cbz, source, only_if_exists );
				zimbra_check( !err, exit, msg = _( "Unable to go online" ); err = GNOME_Evolution_Calendar_OtherError );
			}
		}
	}

	err = GNOME_Evolution_Calendar_Success;

exit:

	if ( err && msg )
	{
		e_cal_backend_notify_error( E_CAL_BACKEND (cbz), msg );
	}

	if ( cache_items )
	{
		g_list_free (cache_items);
	}

	g_mutex_unlock( priv->mutex );

	return err;
}


static ECalBackendSyncStatus
e_cal_backend_zimbra_remove (ECalBackendSync *backend, EDataCal *cal)
{
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;
	ECalBackendSyncStatus err = 0;
	
fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	g_mutex_lock (priv->mutex);

	if ( ( priv->cnc == NULL ) && ( priv->folder_id ) )
	{
		err =- GNOME_Evolution_Calendar_PermissionDenied;
		goto exit;
	}

	if ( priv->folder_id && g_str_equal( priv->folder_id, "10" ) )
	{
		err =- GNOME_Evolution_Calendar_PermissionDenied;
		goto exit;
	}

	if ( priv->folder_id && priv->cnc )
	{
		e_zimbra_connection_delete_folder( priv->cnc, priv->folder_id );
	}

	if ( priv->cache )
	{
		e_file_cache_remove (E_FILE_CACHE (priv->cache));
	}

	err = GNOME_Evolution_Calendar_Success;

exit:

	g_mutex_unlock (priv->mutex);

	return err;
}

/* is_loaded handler for the file backend */
static gboolean
e_cal_backend_zimbra_is_loaded (ECalBackend *backend)
{
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	return priv->cache ? TRUE : FALSE;
}

/* is_remote handler for the file backend */
static CalMode
e_cal_backend_zimbra_get_mode (ECalBackend *backend)
{
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	return priv->mode;
}

/* Set_mode handler for the file backend */
static void
e_cal_backend_zimbra_set_mode (ECalBackend *backend, CalMode mode)
{
	ECalBackendZimbra			*	cbz;
	ECalBackendZimbraPrivate	*	priv;
	
fprintf( stderr, "in func: %s\n", __FUNCTION__ );

	cbz		= E_CAL_BACKEND_ZIMBRA (backend);
	priv	= cbz->priv;

fprintf( stderr, "priv->mode = %d, mode = %d\n", priv->mode, mode );

	if (priv->mode != mode)
	{
		g_mutex_lock (priv->mutex);

		priv->mode_changed = TRUE;

		switch (mode)
		{
			// Go Online

			case CAL_MODE_REMOTE:
			{
				priv->mode		= CAL_MODE_REMOTE;
				priv->read_only = FALSE;

				e_cal_backend_notify_mode (backend, GNOME_Evolution_Calendar_CalListener_MODE_SET, GNOME_Evolution_Calendar_MODE_REMOTE);

				if ( e_cal_backend_zimbra_is_loaded( backend ) )
				{
					e_cal_backend_notify_auth_required( backend );
				}
			}
			break;

			// Go Offline

			case CAL_MODE_LOCAL:
			{
				/* FIXME: make sure we update the cache before closing the connection */
				priv->mode = CAL_MODE_LOCAL;
				go_offline( cbz );

				e_cal_backend_notify_mode( backend, GNOME_Evolution_Calendar_CalListener_MODE_SET, GNOME_Evolution_Calendar_MODE_LOCAL );
			}
			break;

			default :
			{
				e_cal_backend_notify_mode( backend, GNOME_Evolution_Calendar_CalListener_MODE_NOT_SUPPORTED, cal_mode_to_corba( mode ) );
			}
			break;
		}

		g_mutex_unlock( priv->mutex );
	}
	else
	{
		e_cal_backend_notify_mode( backend, GNOME_Evolution_Calendar_CalListener_MODE_SET, cal_mode_to_corba( mode ) );
	}
}


static ECalBackendSyncStatus
e_cal_backend_zimbra_get_default_object (ECalBackendSync *backend, EDataCal *cal, char **object)
{
	
	ECalComponent *comp;
	
fprintf( stderr, "in func: %s\n", __FUNCTION__ );
        comp = e_cal_component_new ();

	switch (e_cal_backend_get_kind (E_CAL_BACKEND (backend))) {
	case ICAL_VEVENT_COMPONENT:
        	e_cal_component_set_new_vtype (comp, E_CAL_COMPONENT_EVENT);
		break;
	case ICAL_VTODO_COMPONENT:
		e_cal_component_set_new_vtype (comp, E_CAL_COMPONENT_TODO);
		break;
	default:
		g_object_unref (comp);
		return GNOME_Evolution_Calendar_ObjectNotFound;
	}

	*object = e_cal_component_get_as_string (comp);
	g_object_unref (comp);

	return GNOME_Evolution_Calendar_Success;
}

struct instance_data {
    time_t start;
    gboolean found;
};

static void
check_instance (icalcomponent *comp, struct icaltime_span *span, void *data)
{
    struct instance_data *instance = data;

fprintf( stderr, "in check_instance: span->start = %d, instance->start = %d\n", span->start, instance->start );

    if (span->start == instance->start)
        instance->found = TRUE;
}

/**
 * e_cal_util_construct_instance:
 * @icalcomp: A recurring #icalcomponent
 * @rid: The RECURRENCE-ID to construct a component for
 *
 * This checks that @rid indicates a valid recurrence of @icalcomp, and
 * if so, generates a copy of @comp containing a RECURRENCE-ID of @rid.
 *
 * Return value: the instance, or %NULL.
 **/
static icalcomponent *
construct_instance (icalcomponent *icalcomp,
                   struct icaltimetype rid)
{
    struct instance_data instance;
    struct icaltimetype start, end;

    g_return_val_if_fail (icalcomp != NULL, NULL);

    /* Make sure this is really recurring */
    if (!icalcomponent_get_first_property (icalcomp, ICAL_RRULE_PROPERTY) &&
        !icalcomponent_get_first_property (icalcomp, ICAL_RDATE_PROPERTY))
        return NULL;

    /* Make sure the specified instance really exists */
    start = icaltime_convert_to_zone (rid, icaltimezone_get_utc_timezone ());
    end = start;

	// This is a bug I fixed in this function...if the time is a date, and not a datetime, then we should add a day, not a sec

	if ( icaltime_is_date( end ) )
	{
fprintf( stderr, "time is date!!!\n" );
    	icaltime_adjust (&end, 1, 0, 0, 0);
	}
	else
	{
fprintf( stderr, "time is datetime!!!\n" );
    	icaltime_adjust (&end, 0, 0, 0, 1);
	}

    instance.start = icaltime_as_timet (start);
    instance.found = FALSE;
    icalcomponent_foreach_recurrence (icalcomp, start, end,
                      check_instance, &instance);
   if (!instance.found)
	{
fprintf( stderr, "******* instance not found\n" );
        return NULL;
	}

    /* Make the instance */
    icalcomp = icalcomponent_new_clone (icalcomp);
    icalcomponent_set_recurrenceid (icalcomp, rid);

    return icalcomp;
}


/* Get_object_component handler for the zimbra backend */

static ECalBackendSyncStatus
e_cal_backend_zimbra_get_object
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	const char		*	uid,
	const char		*	rid,
	char			**	object
	)
{
	ECalBackendZimbra 			*	cbz 		=	(ECalBackendZimbra *) backend;
	ECalBackendZimbraPrivate	*	priv		=	NULL;
	GSList						*	components	=	NULL;
	ECalComponent				*	comp		=	NULL;

fprintf( stderr, "in func: %s, uid = %s, rid = %s\n", __FUNCTION__, uid, rid );

	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), GNOME_Evolution_Calendar_OtherError);

	priv = cbz->priv;

	g_mutex_lock( priv->mutex );

	*object = NULL;

	// Search for the object(s) in the cache

	if ( rid && *rid )
	{
		if ( ( comp = e_cal_backend_cache_get_component( cbz->priv->cache, uid, rid ) ) && ( e_cal_backend_get_kind( E_CAL_BACKEND( backend ) ) == icalcomponent_isa( e_cal_component_get_icalcomponent( comp ) ) ) )
		{
			*object = e_cal_component_get_as_string( comp );
		}
		else if ( ( comp = get_main_component( cbz, uid ) ) != NULL )
		{
			// I grabbed this code from the file backend.

			icalcomponent	*	icalcomp;
			icaltimetype		itt;

			itt	= icaltime_from_string( rid );

			if ( ( icalcomp = construct_instance( e_cal_component_get_icalcomponent( comp ), itt ) ) != NULL )
			{
            	*object = g_strdup( icalcomponent_as_ical_string( icalcomp ) );
            	icalcomponent_free( icalcomp );
			}
			else
			{
				*object = NULL;
			}

			g_object_unref( comp );
		}
		else
		{
			*object = NULL;
		}
	}
	else if ( ( components = e_cal_backend_cache_get_components_by_uid( cbz->priv->cache, uid ) ) != NULL )
	{
		// Do we have detached recurrences?
	
		if ( g_slist_length( components ) > 1 )
		{
  			icalcomponent	*	icalcomp;
			GSList			*	l;
		
			icalcomp = e_cal_util_new_top_level();
		
			for ( l = components; l; l = l->next )
			{
				icalcomponent_add_component( icalcomp, icalcomponent_new_clone( e_cal_component_get_icalcomponent( E_CAL_COMPONENT( l->data ) ) ) );
			}
		
        	*object = g_strdup( icalcomponent_as_ical_string( icalcomp ) );
		
        	icalcomponent_free (icalcomp);
		}
		else
		{
			comp = E_CAL_COMPONENT( components->data );
		
			if ( e_cal_backend_get_kind( E_CAL_BACKEND( backend ) ) == icalcomponent_isa( e_cal_component_get_icalcomponent( comp ) ) )
			{
				*object = e_cal_component_get_as_string( comp );
			}
		}
	
		g_slist_foreach( components, ( GFunc ) g_object_unref, NULL );
		g_slist_free( components );
	}
	
	g_mutex_unlock( priv->mutex );

	return *object ? GNOME_Evolution_Calendar_Success : GNOME_Evolution_Calendar_ObjectNotFound;
}


/* Get_timezone_object handler for the zimbra backend */
static ECalBackendSyncStatus
e_cal_backend_zimbra_get_timezone (ECalBackendSync *backend, EDataCal *cal, const char *tzid, char **object)
{
	ECalBackendZimbra			*	cbz;
	ECalBackendZimbraPrivate	*	priv;
	const icaltimezone			*	zone;
	icalcomponent				*	icalcomp;

	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	g_return_val_if_fail (tzid != NULL, GNOME_Evolution_Calendar_ObjectNotFound);

	if ( !strcmp( tzid, "UTC" ) )
	{
		zone = icaltimezone_get_utc_timezone();
	}
	else 
	{
		zone = e_cal_backend_cache_get_timezone( cbz->priv->cache, tzid );
	}

	if ( zone )
	{
        icalcomp = icaltimezone_get_component( ( icaltimezone* ) zone );
	}
	else
	{
fprintf( stderr, "returning object_not_found\n" );
		return GNOME_Evolution_Calendar_ObjectNotFound;
	}

	if ( !icalcomp )
	{
fprintf( stderr, "returning invliad_object\n" );
		return GNOME_Evolution_Calendar_InvalidObject;
	}
                                                      
	*object = g_strdup (icalcomponent_as_ical_string (icalcomp));

    return GNOME_Evolution_Calendar_Success;
}

/* Add_timezone handler for the zimbra backend */
static ECalBackendSyncStatus
e_cal_backend_zimbra_add_timezone (ECalBackendSync *backend, EDataCal *cal, const char *tzobj)
{
	icalcomponent *tz_comp;
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	cbz = (ECalBackendZimbra *) backend;

	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), GNOME_Evolution_Calendar_OtherError);
	g_return_val_if_fail (tzobj != NULL, GNOME_Evolution_Calendar_OtherError);

	priv = cbz->priv;

	tz_comp = icalparser_parse_string (tzobj);
	if (!tz_comp)
		return GNOME_Evolution_Calendar_InvalidObject;

	if (icalcomponent_isa (tz_comp) == ICAL_VTIMEZONE_COMPONENT) {
		icaltimezone *zone;

		zone = icaltimezone_new ();
		icaltimezone_set_component (zone, tz_comp);
		if (e_cal_backend_cache_put_timezone (priv->cache, zone) == FALSE) {
			icaltimezone_free (zone, 1);
			return GNOME_Evolution_Calendar_OtherError;
		}
		icaltimezone_free (zone, 1);
	}
	return GNOME_Evolution_Calendar_Success;
}

static ECalBackendSyncStatus
e_cal_backend_zimbra_set_default_timezone (ECalBackendSync *backend, EDataCal *cal, const char *tzid)
{
	ECalBackendZimbra			* cbz;
	ECalBackendZimbraPrivate	* priv;

fprintf( stderr, "in func: %s, tzid = %s\n", __FUNCTION__, tzid );

	cbz		= E_CAL_BACKEND_ZIMBRA (backend);
	priv	= cbz->priv;
	
	// Set the default timezone to it.

	priv->default_zone = icaltimezone_get_builtin_timezone_from_tzid (tzid);

	return GNOME_Evolution_Calendar_Success;
}

/* Gets the list of attachments */
static ECalBackendSyncStatus
e_cal_backend_zimbra_get_attachment_list (ECalBackendSync *backend, EDataCal *cal, const char *uid, const char *rid, GSList **list)
{
fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	/* TODO implement the function */
	return GNOME_Evolution_Calendar_Success;
}

// Get_objects_in_range handler for the zimbra backend



static ECalBackendSyncStatus
e_cal_backend_zimbra_get_object_list
	(
	ECalBackendSync *	backend,
	EDataCal		*	cal,
	const char		*	sexp,
	GList			**	objects
	)
{
	ECalBackendZimbra			*	cbz				=	NULL;
	ECalBackendZimbraPrivate	*	priv			=	NULL;
	GList						*	components		=	NULL;
	GList						*	l				=	NULL;
	ECalBackendSExp				*	cbsexp			=	NULL;
	gboolean						mutex_locked	=	FALSE;
	gboolean						search_needed	=	TRUE;
	ECalBackendSyncStatus			err				=	0;
        
fprintf( stderr, "in func: %s\n", __FUNCTION__ );

	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	g_mutex_lock( priv->mutex );
	mutex_locked = TRUE;

	if ( !strcmp( sexp, "#t" ) )
	{
		search_needed = FALSE;
	}

	cbsexp = e_cal_backend_sexp_new( sexp );
	zimbra_check( cbsexp, exit, err = GNOME_Evolution_Calendar_InvalidQuery );

	*objects = NULL;

	components = e_cal_backend_cache_get_components( priv->cache );

	for ( l = components; l != NULL; l = l->next )
	{
		ECalComponent * comp = E_CAL_COMPONENT( l->data );

		if ( e_cal_backend_get_kind( E_CAL_BACKEND( backend ) ) == icalcomponent_isa( e_cal_component_get_icalcomponent( comp ) ) )
		{
			if ( ( !search_needed ) || ( e_cal_backend_sexp_match_comp( cbsexp, comp, E_CAL_BACKEND( backend ) ) ) )
			{
				char * str = e_cal_component_get_as_string( comp );

				*objects = g_list_append( *objects, str );
			}
		}
	}

	err = GNOME_Evolution_Calendar_Success;

exit:

	if ( components )
	{
		g_list_foreach( components, (GFunc) g_object_unref, NULL );
		g_list_free( components );
	}

	if ( cbsexp )
	{
		g_object_unref (cbsexp);
	}

	if ( mutex_locked )
	{
		g_mutex_unlock( priv->mutex );
	}

	return err;
}


// Get_query handler for the zimbra backend */

static void
e_cal_backend_zimbra_start_query
	(
	ECalBackend		*	backend,
	EDataCalView	*	query
	)
{
	ECalBackendZimbra			*	cbz		=	NULL;
	ECalBackendZimbraPrivate	*	priv	=	NULL;
	GList						*	objects =	NULL;
	ECalBackendSyncStatus			err		=	0;;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );

	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	err = e_cal_backend_zimbra_get_object_list( E_CAL_BACKEND_SYNC (backend), NULL, e_data_cal_view_get_text (query), &objects );
	zimbra_check_okay( err, exit );

	// notify listeners of all objects

	if ( objects )
	{
		e_data_cal_view_notify_objects_added( query, ( const GList* ) objects );
	}

	err = GNOME_Evolution_Calendar_Success;

exit:

	if ( objects )
	{
		g_list_foreach (objects, (GFunc) g_free, NULL);
		g_list_free (objects);
	}

	e_data_cal_view_notify_done( query, err );
}


/* Get_free_busy handler for the file backend */
static ECalBackendSyncStatus
e_cal_backend_zimbra_get_free_busy
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	GList			*	users,
	time_t				start,
	time_t				end,
	GList			**	freebusy
	)
{
	ECalBackendZimbra	*	cbz;
	EZimbraConnection	*	cnc;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );

	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	cnc = cbz->priv->cnc;

	return GNOME_Evolution_Calendar_OtherError;
}


/* Get_changes handler for the zimbra backend */
static ECalBackendSyncStatus
e_cal_backend_zimbra_get_changes (ECalBackendSync *backend, EDataCal *cal, const char *change_id,
				     GList **adds, GList **modifies, GList **deletes)
{
	ECalBackendZimbra *cbz;
	cbz = E_CAL_BACKEND_ZIMBRA (backend);

fprintf( stderr, "in func: %s\n", __FUNCTION__ );

	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), GNOME_Evolution_Calendar_InvalidObject);
	g_return_val_if_fail (change_id != NULL, GNOME_Evolution_Calendar_ObjectNotFound);

	return GNOME_Evolution_Calendar_Success;

}

/* Discard_alarm handler for the file backend */
static ECalBackendSyncStatus
e_cal_backend_zimbra_discard_alarm (ECalBackendSync *backend, EDataCal *cal, const char *uid, const char *auid)
{
fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	return GNOME_Evolution_Calendar_OtherError;
}

static icaltimezone *
e_cal_backend_zimbra_internal_get_default_timezone (ECalBackend *backend)
{
	ECalBackendZimbra * cbz;

	cbz	= E_CAL_BACKEND_ZIMBRA( backend );

	return cbz->priv->default_zone;
}



static icaltimezone *
e_cal_backend_zimbra_internal_get_timezone (ECalBackend *backend, const char *tzid)
{
	ECalBackendZimbra	*	cbz;
	icaltimezone *zone;

	cbz		= E_CAL_BACKEND_ZIMBRA (backend);

	zone = icaltimezone_get_builtin_timezone_from_tzid (tzid);

	if (!zone)
	{
		zone = ( icaltimezone* ) e_cal_backend_cache_get_timezone( cbz->priv->cache, tzid );
	}

	if ( !zone )
	{
		zone = icaltimezone_get_utc_timezone();
	}

	return zone;
}


static void
update_component
	(
	ECalBackendZimbra	*	cbz,
	ECalComponent		*	comp,
	char				*	id
	)
{
	icalproperty * icalprop;
	
	if ( id )
	{
		if ( ( icalprop = get_zimbra_item_property( e_cal_component_get_icalcomponent( comp ), ZIMBRA_X_APPT_ID ) ) != NULL )
		{
			icalproperty_set_x_name( icalprop, ZIMBRA_X_APPT_ID );
		}
		else
		{
			icalprop = icalproperty_new_x( id );
			icalproperty_set_x_name( icalprop, ZIMBRA_X_APPT_ID );
			icalcomponent_add_property( e_cal_component_get_icalcomponent( comp ), icalprop );
		}

		e_cal_component_commit_sequence( comp );

		ECalComponentId * stupid;

		stupid = e_cal_component_get_id( comp );

		e_cal_backend_cache_remove_component( cbz->priv->cache, stupid->uid, stupid->rid );

		e_cal_component_free_id( stupid );

		e_cal_backend_cache_put_component( cbz->priv->cache, comp );
	}
}


static ECalBackendSyncStatus
e_cal_backend_zimbra_create_object
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	char			**	calobj,
	char			**	uid
	)
{
	ECalBackendZimbra			*	cbz			= NULL;
	ECalBackendZimbraPrivate	*	priv		= NULL;
	ECalComponent				*	comp		= NULL;
	icalcomponent				*	icalcomp	= NULL;
	const char					*	icalid		= NULL;
	const char					*	rid			= NULL;
	gboolean						ok;
	EZimbraConnectionStatus			err			= 0;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );

	cbz		= E_CAL_BACKEND_ZIMBRA (backend);
	priv	= cbz->priv;

	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), GNOME_Evolution_Calendar_InvalidObject);
	g_return_val_if_fail (calobj != NULL && *calobj != NULL, GNOME_Evolution_Calendar_InvalidObject);

	// Check the component for validity

fprintf( stderr, "calobj = %s\n", *calobj );

	icalcomp = icalparser_parse_string( *calobj );
	zimbra_check( icalcomp, exit, err = GNOME_Evolution_Calendar_InvalidObject );
	zimbra_check( e_cal_backend_get_kind( E_CAL_BACKEND( backend ) ) == icalcomponent_isa( icalcomp ), exit, err = GNOME_Evolution_Calendar_InvalidObject );

	// Create the ECal Componenet

	comp = e_cal_component_new();
	zimbra_check( comp, exit, err = GNOME_Evolution_Calendar_InvalidObject );

	// Store it in the cache

	e_cal_component_set_icalcomponent( comp, icalcomp );


fprintf( stderr, "create_object: rid  = %s\n", rid );

	e_cal_backend_cache_put_component( priv->cache, comp );

	// Retrieve the uid

	icalid = icalcomponent_get_uid( icalcomp );
	zimbra_check( icalid, exit, err = GNOME_Evolution_Calendar_InvalidObject );

	// Notify the UI

	e_cal_backend_notify_object_created( E_CAL_BACKEND( cbz ), *calobj );

	switch ( priv->mode )
	{
		case CAL_MODE_ANY:
		case CAL_MODE_REMOTE:
		{
			// If we're in on-line mode, then send the update immediately

			if ( !send_update( cbz, icalid ) )
			{
				// If for some reason, this doesn't work, then we'll try it later.

				ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( cbz->priv->cache ), "update", icalid );
				zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_InvalidObject );
			}
		}
		break;

		case CAL_MODE_LOCAL:
		{
			// If we're in off-line mode, then note that we'll want to send this to the server
			// when we're back on-line

			ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( cbz->priv->cache ), "update", icalid );
			zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_InvalidObject );
		}
		break;

		default:
		{
		}
		break;
	}

	err = GNOME_Evolution_Calendar_Success;

exit:

	if ( comp )
	{
		g_object_unref( comp );
	}
	else if ( icalcomp )
	{
		icalcomponent_free( icalcomp );
	}

	return err;
}


static ECalBackendSyncStatus
e_cal_backend_zimbra_modify_object
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	const char		*	calobj, 
	CalObjModType		mod,
	char			**	old_object,
	char			**	new_object
	)
{
	ECalBackendZimbra			*	cbz			= NULL;
	ECalBackendZimbraPrivate	*	priv		= NULL;
	icalcomponent				*	icalcomp	= NULL;
	ECalComponent				*	comp		= NULL;
	ECalComponent				*	main_comp	= NULL;
	ECalComponent				*	cache_comp	= NULL;
	const char					*	uid			= NULL;
	const char					*	rid			= NULL;
	char						*	tag			= NULL;
	gboolean						ok			= FALSE;
	EZimbraConnectionStatus			err			= 0;

fprintf( stderr, "in func: %s, calobj = %s\n", __FUNCTION__, calobj );

	cbz			= E_CAL_BACKEND_ZIMBRA (backend);
	priv		= cbz->priv;
	*old_object = NULL;

	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), GNOME_Evolution_Calendar_InvalidObject);
	g_return_val_if_fail (calobj != NULL, GNOME_Evolution_Calendar_InvalidObject);

	// Check the component for validity

	icalcomp = icalparser_parse_string( calobj );
	zimbra_check( icalcomp, exit, err = GNOME_Evolution_Calendar_InvalidObject );

	comp = e_cal_component_new();
	zimbra_check( comp, exit, err = GNOME_Evolution_Calendar_InvalidObject );

	e_cal_component_set_icalcomponent( comp, icalcomp );
	e_cal_component_get_uid( comp, &uid );

	main_comp	= get_main_component( cbz, uid );
	cache_comp	= e_cal_backend_cache_get_component( priv->cache, uid, rid );

	rid = e_cal_component_get_recurid_as_string( comp );

	if ( rid && !cache_comp )
	{
		// Let's make a small adjustment to the rid.  I consider this a bug...Evolution gives us an rid with no timezone.  This
		// can potentially be a problem, so let's explicitly store the timezone here.

		ECalComponentRange range;

		e_cal_component_get_recurid( comp, &range );

		fprintf( stderr, "recurd tzid = %s\n", range.datetime.tzid );

		if ( !icaltime_is_date( *range.datetime.value ) )
		{
			if ( !range.datetime.tzid )
			{
				icaltime_set_timezone( range.datetime.value, cbz->priv->default_zone );
				range.datetime.tzid = g_strdup( icaltimezone_get_tzid( cbz->priv->default_zone ) );
			}
		}

		e_cal_component_set_recurid( comp, &range );

		e_cal_component_commit_sequence( comp );

		e_cal_component_free_range( &range );

		rid = e_cal_component_get_recurid_as_string( comp );
	}

fprintf( stderr, "modify_object: rid  = %s\n", rid );

	switch ( mod )
	{
		case CALOBJ_MOD_THIS:
		{
			// Check if the object exists

			if ( cache_comp )
			{
				*old_object = e_cal_component_get_as_string( cache_comp );
			}
			else
			{
				*old_object = NULL;
			}

			e_cal_backend_cache_put_component( cbz->priv->cache, comp );

			*new_object = e_cal_component_get_as_string( comp );

			if ( rid && *rid )
			{
				// tag = g_strdup_prinf( "%s|%s", uid, rid );
				tag = g_strdup( uid ); 
			}
			else
			{
				tag = g_strdup( uid );
			}

			zimbra_check( tag, exit, err = GNOME_Evolution_Calendar_OtherError );
		}
		break;

		case CALOBJ_MOD_ALL:
		{
			// I swiped this code from the file backend.  It's basically checking to see if this component
			// has a recurrence.  If it does, then it updates the start and end times from the current main 
			// component.

			if ( e_cal_util_component_has_recurrences( icalcomp ) && rid && *rid )
			{
				icaltimetype start;
				icaltimetype recur;

				recur = icaltime_from_string( rid );
				start = icalcomponent_get_dtstart( icalcomp );

				if ( !recur.zone )
				{
					recur.zone = start.zone;
				}

				if ( icaltime_compare_date_only( start, recur ) == 0 )
				{
					ECalComponentDateTime sdate;
					ECalComponentDateTime edate;

					e_cal_component_get_dtstart( main_comp, &sdate );
					e_cal_component_get_dtend( main_comp, &edate );

					if ( icaltime_compare( start, recur ) != 0 )
					{
						icaltimetype end = icalcomponent_get_dtend( icalcomp );

						sdate.value->hour	= start.hour;
						sdate.value->minute = start.minute;
						sdate.value->second = start.second;

						edate.value->hour	= end.hour;
						edate.value->minute = end.minute;
						edate.value->second = end.second;
					}

					e_cal_component_set_dtstart( comp, &sdate );
					e_cal_component_set_dtend( comp, &edate );

					e_cal_component_set_recurid( comp, NULL );

					e_cal_component_commit_sequence( comp );
				}

				e_cal_component_set_recurid( comp, NULL );
			}

			*old_object = e_cal_component_get_as_string( main_comp );
			*new_object = e_cal_component_get_as_string( comp );

			tag = g_strdup( uid );
			zimbra_check( tag, exit, err = GNOME_Evolution_Calendar_OtherError );

			e_cal_backend_cache_put_component( priv->cache, comp );
		}
		break;

		default:
		{
			// Shouldn't ever happen

			zimbra_check( 0, exit, err = GNOME_Evolution_Calendar_OtherError );
		}
	}

	// Notify

	e_cal_backend_notify_object_modified( E_CAL_BACKEND( cbz ), *old_object, *new_object );

	// Add it to the cache.  We'll then trigger a sync if we're on-line
	// which will ultimately do conflict checking for us.

	ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( cbz->priv->cache ), "update", tag );
	zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_InvalidObject );

	if ( ( priv->mode == CAL_MODE_ANY ) || ( priv->mode == CAL_MODE_REMOTE ) )
	{
		ok = e_zimbra_connection_sync( cbz->priv->cnc );
		zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_OtherError );
	}

exit:

	if ( main_comp )
	{
		g_object_unref( main_comp );
	}

	if ( cache_comp )
	{
		g_object_unref( cache_comp );
	}

	if ( comp )
	{
		g_object_unref( comp );
	}

	if ( tag )
	{
		g_free( tag );
	}

	return err;
}


icalproperty*
get_zimbra_item_property
	(
	icalcomponent	*	icalcomp,
	const char		*	prop_name
	)
{
	icalproperty * icalprop;	

	// Search the component for the X-ZRECORDID property

	icalprop = icalcomponent_get_first_property( icalcomp, ICAL_X_PROPERTY );

	while (icalprop)
	{
		const char * x_name;
		const char * x_val;

		x_name = icalproperty_get_x_name (icalprop);
		x_val = icalproperty_get_x (icalprop);

		if ( !strcmp( x_name, prop_name ) )
		{
			return icalprop;
		}

		icalprop = icalcomponent_get_next_property( icalcomp, ICAL_X_PROPERTY );
	}

	return NULL;
}


static const char *
get_zimbra_item_data
	(
	icalcomponent	*	icalcomp,
	const char		*	prop_name
	)
{
	icalproperty * icalprop;	

	if ( ( icalprop = get_zimbra_item_property( icalcomp, prop_name ) ) != NULL )
	{
		return icalproperty_get_x( icalprop );
	}
	else
	{
		return NULL;
	}
}


static ECalComponent*
get_main_component
	(
	ECalBackendZimbra	*	cbz,
	const char			*	uid
	)
{
	GSList			*	components	=	NULL;
	GSList			*	l			=	NULL;
	ECalComponent	*	comp		=	NULL;

	if ( ( components = e_cal_backend_cache_get_components_by_uid( cbz->priv->cache, uid ) ) != NULL )
	{
		for ( l = components; l; l = l->next )
		{
			ECalComponentRange range;

			comp = E_CAL_COMPONENT( l->data );

			e_cal_component_get_recurid( comp, &range );

			if ( !range.datetime.value )
			{
				g_object_ref( comp );
				break;
			}
			else
			{
				e_cal_component_free_range( &range );
				comp = NULL;
			}
		}

		g_slist_foreach( components, ( GFunc ) g_object_unref, NULL );
		g_slist_free( components );
	}

	return comp;
}


/* Remove_object handler for the file backend */

static ECalBackendSyncStatus
e_cal_backend_zimbra_remove_object
	(
	ECalBackendSync	*	backend,
	EDataCal		*	cal,
	const char		*	uid,
	const char		*	rid,
	CalObjModType		mod,
	char			**	old_object,
	char			**	object
	)
{
	ECalBackendZimbra			*	cbz				=	NULL;
	ECalBackendZimbraPrivate	*	priv			=	NULL;
	char						*	calobj			=	NULL;
	const char					*	id_to_remove	=	NULL;
	icalcomponent				*	icalcomp		=	NULL;
	GSList						*	exdate_list		=	NULL;
	ECalComponent				*	main_comp		=	NULL;
	ECalComponentDateTime		*	dt				=	NULL;
	gboolean						ok;
	ECalBackendSyncStatus			err				=	0;

fprintf( stderr, "in func: %s\n", __FUNCTION__ );
	cbz		= E_CAL_BACKEND_ZIMBRA (backend);
	priv	= cbz->priv;

	*old_object = *object = NULL;

	// Get main component

	main_comp = get_main_component( cbz, uid );

	if ( main_comp )
	{
		switch ( mod )
		{
			case CALOBJ_MOD_THIS:
			{
				if ( rid && *rid )
				{
					ECalComponentDateTime dtstart;
	
					err = e_cal_backend_zimbra_get_object( backend, cal, uid, rid, &calobj );
					zimbra_check_okay( err, exit );
	
					e_cal_backend_cache_remove_component( priv->cache, uid, rid );
	
					e_cal_component_get_dtstart( main_comp, &dtstart );
	
					// Create a new EComponentDateTime that has the right stuff in it.
	
					dt = g_new( ECalComponentDateTime, 1 );
					zimbra_check( dt, exit, err = GNOME_Evolution_Calendar_OtherError );
	
        			dt->value = g_new( struct icaltimetype, 1 );
					zimbra_check( dt->value, exit, err = GNOME_Evolution_Calendar_OtherError );
	
					*dt->value = icaltime_from_string( rid );
	
					if ( dtstart.tzid )
					{
						icaltime_set_timezone( dt->value, dtstart.value->zone );
						dt->tzid = g_strdup( dtstart.tzid );
					}
					else
					{
						icaltime_set_timezone( dt->value, icaltimezone_get_utc_timezone() );
						dt->tzid = g_strdup( "UTC" );
					}

					// Take a snapshot of the component before the changes
	
					*old_object = e_cal_component_get_as_string( main_comp );
	
					// Add the datetime to the components exclude list
	
					e_cal_component_get_exdate_list( main_comp, &exdate_list );
	
					exdate_list = g_slist_append( exdate_list, dt );
	
	fprintf( stderr, "new exdate: %s, tzid = %s\n", rid, dt->tzid );
	
					dt = NULL;
	
					e_cal_component_set_exdate_list( main_comp, exdate_list );
	
					e_cal_component_commit_sequence( main_comp );

					// Take a snapshot of the component after the change

					*object = e_cal_component_get_as_string( main_comp );

					// Put back in the cache

					e_cal_backend_cache_put_component( cbz->priv->cache, main_comp );

					// Notify the UI

					e_cal_backend_notify_object_modified( E_CAL_BACKEND( cbz ), *old_object, *object );

					// And add to update array

					e_zimbra_utils_add_cache_string( E_FILE_CACHE( cbz->priv->cache ), "update", uid );

					// Exit out of switch

					break;
				}
			}

			// There is no break here intentionally.  If there is no recurrence id, then CALOBJ_MOD_THIS == CALOBJ_MOD_ALL.
			// So just flow through.
	
			case CALOBJ_MOD_ALL:
			{
				icalcomp = e_cal_component_get_icalcomponent( main_comp );
				zimbra_check( icalcomp, exit, err = GNOME_Evolution_Calendar_InvalidObject );
	
				// Not exactly sure why we need to do this
	
				*old_object = e_cal_component_get_as_string( main_comp );

				// Cache up the delete.  Then we'll trigger a sync which will ultimately
				// do some conflict resolution for us.
	
				if ( ( id_to_remove = get_zimbra_item_data( icalcomp, ZIMBRA_X_APPT_ID ) ) != NULL )
				{
					ok = e_zimbra_utils_add_cache_string( E_FILE_CACHE( cbz->priv->cache ), "delete", id_to_remove );
					zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_OtherError );
				}
	
				remove_components( cbz, uid );
			}
			break;

			default:
			{
				// Shouldn't ever happen
	
				zimbra_check( 0, exit, err = GNOME_Evolution_Calendar_OtherError );
			}
			break;
		}

		if ( ( priv->mode == CAL_MODE_ANY ) || ( priv->mode == CAL_MODE_REMOTE ) )
		{
			ok = e_zimbra_connection_sync( priv->cnc );
			zimbra_check( ok, exit, err = GNOME_Evolution_Calendar_OtherError );
		}
	}
	else
	{
		g_warning( "orphaned component found: uid = %s, rid = %s", uid, rid );
		remove_components( cbz, uid );
	}

exit:

	if ( main_comp )
	{
		g_object_unref( main_comp );
	}

	if ( exdate_list )
	{
		e_cal_component_free_exdate_list( exdate_list );
	}

	if ( calobj )
	{
		g_free( calobj );
	}

	return err;
}


/* Update_objects handler for the file backend. */

static ECalBackendSyncStatus
e_cal_backend_zimbra_receive_objects (ECalBackendSync *backend, EDataCal *cal, const char *calobj)
{
fprintf( stderr, "in %s\n", __FUNCTION__ );
	return GNOME_Evolution_Calendar_InvalidObject;
}


static ECalBackendSyncStatus
e_cal_backend_zimbra_send_objects (ECalBackendSync *backend, EDataCal *cal, const char *calobj, GList **users,
				      char **modified_calobj)
{
#if 0
	ECalBackendSyncStatus status = GNOME_Evolution_Calendar_OtherError;
	icalcomponent *icalcomp, *subcomp;
	icalcomponent_kind kind;
	icalproperty_method method;
	ECalBackendZimbra *cbz;
	ECalBackendZimbraPrivate *priv;

	*users = NULL;
	*modified_calobj = NULL;

	cbz = E_CAL_BACKEND_ZIMBRA (backend);
	priv = cbz->priv;

	if (priv->mode == CAL_MODE_LOCAL) {
		go_offline (cbz);
		return GNOME_Evolution_Calendar_RepositoryOffline;
	}

	icalcomp = icalparser_parse_string (calobj);
	if (!icalcomp)
		return GNOME_Evolution_Calendar_InvalidObject;

	method = icalcomponent_get_method (icalcomp);
	kind = icalcomponent_isa (icalcomp);
	if (kind == ICAL_VCALENDAR_COMPONENT) {
		subcomp = icalcomponent_get_first_component (icalcomp,
							     e_cal_backend_get_kind (E_CAL_BACKEND (backend)));
		while (subcomp) {

			status = send_object (cbz, cal, subcomp, method);
			if (status != GNOME_Evolution_Calendar_Success)
				break;
			subcomp = icalcomponent_get_next_component (icalcomp,
								    e_cal_backend_get_kind (E_CAL_BACKEND (backend)));
		}
	} else if (kind == e_cal_backend_get_kind (E_CAL_BACKEND (backend))) {
		status = send_object (cbz, cal, icalcomp, method);
	} else
		status = GNOME_Evolution_Calendar_InvalidObject;
	
	if (status == GNOME_Evolution_Calendar_Success) {
		ECalComponent *comp;

		comp = e_cal_component_new ();
		
		if (e_cal_component_set_icalcomponent (comp, icalcomp)) {
			GSList *attendee_list = NULL, *tmp;
			e_cal_component_get_attendee_list (comp, &attendee_list);
			/* convert this into GList */
			for (tmp = attendee_list; tmp; tmp = g_slist_next (tmp))
				*users = g_list_append (*users, tmp);
			
			g_object_unref (comp);	
		}
		*modified_calobj = g_strdup (calobj);
	}
	icalcomponent_free (icalcomp);

	return status;
#endif

*users = NULL;
    *modified_calobj = g_strdup (calobj);

    return GNOME_Evolution_Calendar_Success;


}


/* Object initialization function for the file backend */
static void
e_cal_backend_zimbra_init (ECalBackendZimbra *cbz, ECalBackendZimbraClass *class)
{
	ECalBackendZimbraPrivate *priv;

	priv = g_new0( ECalBackendZimbraPrivate, 1 );

	priv->cnc = NULL;

	/* create the mutex for thread safety */
	priv->mutex = g_mutex_new();

	cbz->priv = priv;

	e_cal_backend_sync_set_lock(E_CAL_BACKEND_SYNC (cbz), TRUE);
}


/* Class initialization function for the gw backend */
static void
e_cal_backend_zimbra_class_init (ECalBackendZimbraClass *class)
{
	GObjectClass *object_class;
	ECalBackendClass *backend_class;
	ECalBackendSyncClass *sync_class;

	object_class = (GObjectClass *) class;
	backend_class = (ECalBackendClass *) class;
	sync_class = (ECalBackendSyncClass *) class;

	parent_class = g_type_class_peek_parent (class);

	object_class->dispose = e_cal_backend_zimbra_dispose;
	object_class->finalize = e_cal_backend_zimbra_finalize;

	sync_class->is_read_only_sync = e_cal_backend_zimbra_is_read_only;
	sync_class->get_cal_address_sync = e_cal_backend_zimbra_get_cal_address;
 	sync_class->get_alarm_email_address_sync = e_cal_backend_zimbra_get_alarm_email_address;
 	sync_class->get_ldap_attribute_sync = e_cal_backend_zimbra_get_ldap_attribute;
 	sync_class->get_static_capabilities_sync = e_cal_backend_zimbra_get_static_capabilities;
	sync_class->open_sync = e_cal_backend_zimbra_open;
	sync_class->remove_sync = e_cal_backend_zimbra_remove;
	sync_class->create_object_sync = e_cal_backend_zimbra_create_object;
	sync_class->modify_object_sync = e_cal_backend_zimbra_modify_object;
	sync_class->remove_object_sync = e_cal_backend_zimbra_remove_object;
	sync_class->discard_alarm_sync = e_cal_backend_zimbra_discard_alarm;
	sync_class->receive_objects_sync = e_cal_backend_zimbra_receive_objects;
	sync_class->send_objects_sync = e_cal_backend_zimbra_send_objects;
 	sync_class->get_default_object_sync = e_cal_backend_zimbra_get_default_object;
	sync_class->get_object_sync = e_cal_backend_zimbra_get_object;
	sync_class->get_object_list_sync = e_cal_backend_zimbra_get_object_list;
	sync_class->get_attachment_list_sync = e_cal_backend_zimbra_get_attachment_list;
	sync_class->get_timezone_sync = e_cal_backend_zimbra_get_timezone;
	sync_class->add_timezone_sync = e_cal_backend_zimbra_add_timezone;
	sync_class->set_default_timezone_sync = e_cal_backend_zimbra_set_default_timezone;
	sync_class->get_freebusy_sync = e_cal_backend_zimbra_get_free_busy;
	sync_class->get_changes_sync = e_cal_backend_zimbra_get_changes;

	backend_class->is_loaded = e_cal_backend_zimbra_is_loaded;
	backend_class->start_query = e_cal_backend_zimbra_start_query;
	backend_class->get_mode = e_cal_backend_zimbra_get_mode;
	backend_class->set_mode = e_cal_backend_zimbra_set_mode;
	backend_class->internal_get_default_timezone = e_cal_backend_zimbra_internal_get_default_timezone;
	backend_class->internal_get_timezone = e_cal_backend_zimbra_internal_get_timezone;
}


/**
 * e_cal_backend_zimbra_get_type:
 * @void: 
 * 
 * Registers the #ECalBackendZimbra class if necessary, and returns the type ID
 * associated to it.
 * 
 * Return value: The type ID of the #ECalBackendZimbra class.
 **/
GType
e_cal_backend_zimbra_get_type (void)
{
	static GType e_cal_backend_zimbra_type = 0;

	if (!e_cal_backend_zimbra_type) {
		static GTypeInfo info = {
                        sizeof (ECalBackendZimbraClass),
                        (GBaseInitFunc) NULL,
                        (GBaseFinalizeFunc) NULL,
                        (GClassInitFunc) e_cal_backend_zimbra_class_init,
                        NULL, NULL,
                        sizeof (ECalBackendZimbra),
                        0,
                        (GInstanceInitFunc) e_cal_backend_zimbra_init
                };
		e_cal_backend_zimbra_type = g_type_register_static (E_TYPE_CAL_BACKEND_SYNC,
								  "ECalBackendZimbra", &info, 0);
	}

	return e_cal_backend_zimbra_type;
}

void
e_cal_backend_zimbra_notify_error_code (ECalBackendZimbra *cbz, EZimbraConnectionStatus status)
{
	const char *msg;

	g_return_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz));

	msg = e_zimbra_connection_get_error_message (status);
	if (msg)
		e_cal_backend_notify_error (E_CAL_BACKEND (cbz), msg);
}

const char *
e_cal_backend_zimbra_get_local_attachments_store (ECalBackendZimbra *cbz)
{
	g_return_val_if_fail (E_IS_CAL_BACKEND_ZIMBRA (cbz), NULL);
	return cbz->priv->local_attachments_store;
}


const char *
e_cal_backend_zimbra_peek_account( ECalBackendZimbra* cbz )
{
	return cbz->priv->account;
}
