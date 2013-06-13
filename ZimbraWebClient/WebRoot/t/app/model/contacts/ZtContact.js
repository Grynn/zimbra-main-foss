/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2013 VMware, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

/**
 * This class represents a contact, which is typically a person, but also could
 * be a distribution list.
 *
 * @author Conrad Damon <cdamon@zimbra.com>
 */
var urlBase = ZCS.constant.SERVICE_URL_BASE;

Ext.define('ZCS.model.contacts.ZtContact', {

	extend: 'ZCS.model.ZtItem',

	requires: [
		'ZCS.model.contacts.ZtContactReader',
		'ZCS.model.contacts.ZtContactWriter'
	],

	config: {

		fields: [
/*
			{ name: 'firstName', type: 'string' },
			{ name: 'lastName', type: 'string' },
            { name: 'namePrefix', type: 'string' },
            { name: 'middleName', type: 'string' },
            { name: 'maidenName', type: 'string' },
            { name: 'nameSuffix', type: 'string' },
            {
                name: 'emailFields',
                type: 'auto'
            },
            {
                name: 'mobilePhoneFields',
                type: 'auto'
            },
            {
                name: 'workPhoneFields',
                type: 'auto'
            },
            {
                name: 'otherPhoneFields',
                type: 'auto'
            },
            {
                name: 'homeURLFields',
                type: 'auto'
            },
            {
                name: 'workURLFields',
                type: 'auto'
            },
            {
                name: 'otherURLFields',
                type: 'auto'
            },
            { name: 'jobTitle', type: 'string'},
            { name: 'department', type: 'string'},
            { name: 'company', type: 'string' },
			{ name: 'fileAs', type: 'int' } ,
            { name: 'image', type: 'auto'},
            { name: 'imagepart', type: 'auto'},
            { name: 'zimletImage', type: 'auto'},
            //Home Address Fields
            { name: 'homeStreetFields', type: 'auto'},
            { name: 'homeCityFields', type: 'auto'},
            { name: 'homeStateFields', type: 'auto'},
            { name: 'homePostalCodeFields', type: 'auto'},
            { name: 'homeCountryFields', type: 'auto'},
            //Work Address Fields
            { name: 'workStreetFields', type: 'auto'},
            { name: 'workCityFields', type: 'auto'},
            { name: 'workStateFields', type: 'auto'},
            { name: 'workPostalCodeFields', type: 'auto'},
            { name: 'workCountryFields', type: 'auto'},
            //Other Address Fields
            { name: 'otherStreetFields', type: 'auto'},
            { name: 'otherCityFields', type: 'auto'},
            { name: 'otherStateFields', type: 'auto'},
            { name: 'otherPostalCodeFields', type: 'auto'},
            { name: 'otherCountryFields', type: 'auto'},
*/

			{ name: 'attrs', type: 'auto' },

//			{ name: 'nickname', type: 'string' },
//			{ name: 'jobTitle', type: 'string' },
//			{ name: 'company', type: 'string' },

			{ name: 'email', type: 'auto' },
			{ name: 'phone', type: 'auto' },
			{ name: 'address', type: 'auto' },
			{ name: 'fax', type: 'auto' },
			{ name: 'url', type: 'auto' },

			// groups I think
			{
				name: 'displayName',
				type: 'string',
				convert: function (v, record) {
					if (record.data.firstName && record.data.lastName) {
						return record.data.firstName + ' ' + record.data.lastName;
					} else if (record.data.emailFields) {
						return record.data.emailFields[0];
					} else {
						return record.data.nickname;
					}
				}
			},

			// long name, eg "Johnathan Smith"
			{
				name: 'longName',
				type: 'string',
				convert: function (v, record) {
					var d = record.data.attrs || {};
					return (d.firstName && d.lastName) ? [d.firstName, d.lastName].join(' ') : d.firstName || d.email || '';
				}
			},

			// last name first, eg "Smith, Johnathan"
			{
				name: 'nameLastFirst',
				type: 'string',
				convert: function (v, record) {
					var d = record.data.attrs || {};
					return (d.firstName && d.lastName) ? [d.firstName, d.lastName].join(' ') : d.firstName || d.email || '';
				}
			},

			// short name or nickname, eg "John"
			{
				name: 'shortName',
				type: 'string',
				convert: function (v, record) {
					var d = record.data.attrs || {};
					return d.nickname || d.firstName || d.email || d.lastName || '';
				}
			},

			{
				name: 'job',
				type: 'string',
				convert: function(v, record) {
					var d = record.data.attrs || {};
					return Ext.Array.clean([d.jobTitle, d.company]).join(', ');
				}
			},

/*
			{ name: 'isHomeAddressExists', type: 'boolean',
                convert:function(v, record) {
                    if (record.data.homeStreetFields || record.data.homeCityFields || record.data.homeStateFields
                        || record.data.homePostalCodeFields || record.data.homeCountryFields) {
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            { name: 'isWorkAddressExists', type: 'boolean',
                convert:function(v, record) {
                    if (record.data.workStreetFields || record.data.workCityFields || record.data.workStateFields
                        || record.data.workPostalCodeFields || record.data.workCountryFields) {
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            { name: 'isOtherAddressExists', type: 'boolean',
                convert:function(v, record) {
                    if (record.data.otherStreetFields || record.data.otherCityFields || record.data.otherStateFields
                        || record.data.otherPostalCodeFields || record.data.otherCountryFields) {
                        return true;
                    } else {
                        return false;
                    }
                }
            },
*/
            { name: 'imageUrl', type:'auto',
                convert: function(v, record) {
                    var image = record.data.image;
                    var imagePart  = (image && image.part) || record.data.imagepart;

                    if (!imagePart) {
                        return record.data.zimletImage || null;  //return zimlet populated image only if user-uploaded image is not there.
                    }

                    return ZCS.htmlutil.buildUrl({
                        path: ZCS.constant.PATH_MSG_FETCH,
                        qsArgs: {
                            auth: 'co',
                            id: record.data.id,
                            part: imagePart,
                            max_width:48,
                            t:(new Date()).getTime()
                        }
                    });
                }
            },

			// Contact group
			{ name: 'isGroup', type: 'boolean' },
            { name: 'groupMembers', type: 'auto' },
			{ name: 'memberEmail', type: 'string' },
			{ name: 'memberPhone', type: 'string' }
        ],

		proxy: {
			type: 'soapproxy',
			api: {
				create  : urlBase + 'CreateContactRequest',
				read    : urlBase + 'GetContactsRequest',
				update  : urlBase + 'ContactActionRequest',
				destroy : urlBase + 'ContactActionRequest'
			},
			reader: 'contactreader',
			writer: 'contactwriter'
		}
	}
});
