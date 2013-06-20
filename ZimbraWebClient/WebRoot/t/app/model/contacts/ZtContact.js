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

			{ name: 'folderId',     type: 'string' },

			// simple fields (not composite, not multiple) - see ZCS.constant.CONTACT_FIELDS
			{ name: 'firstName',    type: 'string' },
			{ name: 'lastName',     type: 'string' },
			{ name: 'namePrefix',   type: 'string' },
			{ name: 'nameSuffix',   type: 'string' },
			{ name: 'nickname',     type: 'string' },
			{ name: 'maidenName',   type: 'string' },
			{ name: 'middleName',   type: 'string' },
			{ name: 'company',      type: 'string' },
			{ name: 'jobTitle',     type: 'string' },
			{ name: 'department',   type: 'string' },

			// fields that can have multiple instances - see ZCS.constant.CONTACT_MULTI_FIELDS
			{ name: 'email',        type: 'auto' },
			{ name: 'phone',        type: 'auto' },
			{ name: 'address',      type: 'auto' },
			{ name: 'url',          type: 'auto' },

			// Below are fields created out of the simple fields above

			// long name, eg "Johnathan Smith"
			{
				name: 'longName',
				type: 'string',
				convert: function (v, record) {
					var firstName = record.get('firstName'),
						lastName = record.get('lastName');
					return (firstName && lastName) ? [firstName, lastName].join(' ') : firstName || record.get('email') || '';
				}
			},

			// last name first, eg "Smith, Johnathan"
			{
				name: 'nameLastFirst',
				type: 'string',
				convert: function (v, record) {
					var firstName = record.get('firstName'),
						lastName = record.get('lastName');
					return (firstName && lastName) ? [lastName, firstName].join(', ') : firstName || record.get('email') || '';
				}
			},

			// short name or nickname, eg "Johnathan" or "John"
			{
				name: 'shortName',
				type: 'string',
				convert: function (v, record) {
					return record.get('nickname') || record.get('firstName') || record.get('email') || record.get('lastName') || '';
				}
			},

			// full name with all the parts, eg: Mr Fred Barnaby (Delacroix) Flintstone, Esquire “Knuckles”
			{
				name: 'fullName',
				type: 'string',
				convert: function (v, record) {
					var nameParts = [
							record.get('namePrefix'),
							record.get('firstName'),
							record.get('middleName'),
							record.get('maidenName') ? '(' + record.get('maidenName') + ')' : null,
							record.get('lastName')
						],
						fullName = Ext.Array.clean(nameParts).join(' ');

					if (record.get('nameSuffix')) {
						fullName += ', ' + record.get('nameSuffix');
					}
					if (record.get('nickname')) {
						fullName += ' "' + record.get('nickname') + '"';
					}

					return fullName;
				}
			},

			// combo of job title and company, eg "Waiter, Denny's"
			{
				name: 'job',
				type: 'string',
				convert: function(v, record) {
					return Ext.Array.clean([record.get('jobTitle'), record.get('company')]).join(', ');
				}
			},

			// URL to thumbnail picture of contact
            {
	            name: 'imageUrl',
	            type: 'auto',
                convert: function(v, record) {
                    var image = record.data.image;
                    var imagePart  = (image && image.part) || record.data.imagepart;

                    if (!imagePart) {
                        return record.data.zimletImage || null;  //return zimlet populated image only if user-uploaded image is not there.
                    }

                    return ZCS.htmlutil.buildUrl({
                        path: ZCS.constant.PATH_MSG_FETCH,
                        qsArgs: {
                            auth:       'co',
                            id:         record.getId(),
                            part:       imagePart,
                            max_width:  48,
                            t:          (new Date()).getTime()
                        }
                    });
                }
            },

			// Fields related to contact groups
			{ name: 'isGroup', type: 'boolean' },       // true for groups
            { name: 'groupMembers', type: 'auto' },     // list of small member objects

			// group member fields
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
	},

	/**
	 * Returns a hash of JSON attribute keys and values based on this contact's fields.
	 *
	 * @return {Object}     JSON attributes
	 */
	fieldsToAttrs: function() {

		// Simple attrs with equivalent contact fields
		var attrs = {};
		Ext.each(ZCS.constant.CONTACT_FIELDS, function(attr) {
			attrs[attr] = this.get(attr);
		}, this);

		// First, set up a list of values for each multiply-appearing type-qualified attr, eg 'homeCity'
		var attrList = {}, type, key;
		Ext.each(ZCS.constant.CONTACT_MULTI_FIELDS, function(multiField) {
			Ext.each(this.get(multiField), function(field) {
				type = field[multiField + 'Type'] || '';
				if (multiField === 'address') {
					Ext.each(ZCS.constant.ADDRESS_FIELDS, function(addrField) {
						if (field[addrField]) {
							key = type ? type + Ext.String.capitalize(addrField) : addrField;
							attrList[key] = attrList[key] || [];
							attrList[key].push(field[addrField]);
						}
					}, this);
				}
				else {
					key = type ? type + Ext.String.capitalize(multiField) : multiField;
					attrList[key] = attrList[key] || [];
					attrList[key].push(field[multiField]);
				}
			}, this);
		}, this);

		// Now, translate the index of each multiple attr into 'homeCity', 'homeCity2', etc
		Ext.Object.each(attrList, function(attr) {
			Ext.each(attrList[attr], function(value, index) {
				var attrName = attr + (index > 0 ? index + 1 : '');
				attrs[attrName] = value;
			}, this);
		}, this);

		return attrs;
	}
});
