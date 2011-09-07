#include "common.h"
#include "Exchange.h"
#include "MAPIContacts.h"


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// MAPIContact
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
MAPIContact::MAPIContact(LPMESSAGE pMessage)
{
	m_bPersonalDL=false;
	m_pMessage = pMessage;

	pr_mail1address = 0,
	pr_mail1entryid = 0,
	pr_mail1type = 0,
	pr_mail1dispname=0,
	pr_mail2address = 0,
	pr_mail2entryid = 0,
	pr_mail2type = 0,
	pr_mail2dispname=0,
	pr_mail3address = 0,
	pr_mail3entryid = 0,
	pr_mail3type = 0,
	pr_mail3dispname=0,
	pr_fileas = 0,
	pr_fileasID = 0,
	pr_business_address_city = 0,
	pr_business_address_country = 0,
	pr_business_address_postal_code = 0,
	pr_business_address_state = 0,
	pr_business_address_street = 0,
    pr_contact_user1_idx = 0,
    pr_contact_user2_idx = 0,
    pr_contact_user3_idx = 0,
    pr_contact_user4_idx = 0,
    pr_contact_oneoffmemebrs = 0,
	pr_imaddress = 0 ;

	//init named props
	nameIds[0] = 0x8083;
	nameIds[0] = 0x8085;
	nameIds[0] = 0x8082;
	nameIds[0] = 0x8084;
	nameIds[0] = 0x8093;
	nameIds[0] = 0x8095;
	nameIds[0] = 0x8092;
	nameIds[0] = 0x8094;
	nameIds[0] = 0x80A3;
	nameIds[0] = 0x80A5; 
	nameIds[0] = 0x80A2;
	nameIds[0] = 0x80A4;
	nameIds[0] = 0x8005;
	nameIds[0] = 0x8006;
	nameIds[0] = 0x8046;
	nameIds[0] = 0x8049;
	nameIds[0] = 0x8048;
	nameIds[0] = 0x8047;
	nameIds[0] = 0x8045;
	nameIds[0] = 0x804f;
	nameIds[0] = 0x8050;
	nameIds[0] = 0x8051;
	nameIds[0] = 0x8052;
	nameIds[0] = 0x8054;
	nameIds[0] = 0x8062;
	
	Init();
}

MAPIContact::~MAPIContact()
{

}

HRESULT MAPIContact::Init()
{
	//is Persoanl DL?
	LPSPropValue pPropValMsgClass = NULL ;
	HRESULT hr=HrGetOneProp( m_pMessage, PR_MESSAGE_CLASS, &pPropValMsgClass ) ;
    if( pPropValMsgClass->ulPropTag == PR_MESSAGE_CLASS_W && 
        _tcsicmp( pPropValMsgClass->Value.LPSZ, L"ipm.distlist" ) == 0 ) 
		m_bPersonalDL = true ;
	
    if( pPropValMsgClass )
		MAPIFreeBuffer( pPropValMsgClass ) ;
    
	//initialize the MAPINAMEID structure GetIDsFromNames requires
	LPMAPINAMEID ppNames[N_NUM_NAMES] = {0};
	for( int i = 0; i < N_NUM_NAMES; i++ )
	{
		MAPIAllocateBuffer( sizeof(MAPINAMEID), (LPVOID*)&(ppNames[i]) );
		ppNames[i]->ulKind = MNID_ID;
		ppNames[i]->lpguid = (LPGUID)(&PS_CONTACT_PROPERTIES);
		ppNames[i]->Kind.lID = nameIds[i];
	}

	//get the real prop tag ID's
	LPSPropTagArray pContactTags = NULL;
	hr = m_pMessage->GetIDsFromNames( N_NUM_NAMES, ppNames, MAPI_CREATE, &pContactTags );
	if(FAILED(hr)) {
        return hr;
    }
	
	//give the prop tag ID's a type
	pr_mail1address					= SetPropType( pContactTags->aulPropTag[N_MAIL1			], PT_TSTRING );
	pr_mail1entryid					= SetPropType( pContactTags->aulPropTag[N_MAIL1EID		], PT_BINARY );
	pr_mail1type					= SetPropType( pContactTags->aulPropTag[N_MAIL1TYPE		], PT_TSTRING );
	pr_mail1dispname				= SetPropType( pContactTags->aulPropTag[N_MAIL1DISPNAME	], PT_TSTRING );
	pr_mail2address					= SetPropType( pContactTags->aulPropTag[N_MAIL2			], PT_TSTRING );
	pr_mail2entryid					= SetPropType( pContactTags->aulPropTag[N_MAIL2EID		], PT_BINARY );
	pr_mail2type					= SetPropType( pContactTags->aulPropTag[N_MAIL2TYPE		], PT_TSTRING );
	pr_mail2dispname				= SetPropType( pContactTags->aulPropTag[N_MAIL2DISPNAME	], PT_TSTRING );
	pr_mail3address					= SetPropType( pContactTags->aulPropTag[N_MAIL3			], PT_TSTRING );
	pr_mail3entryid					= SetPropType( pContactTags->aulPropTag[N_MAIL3EID		], PT_BINARY );
	pr_mail3type					= SetPropType( pContactTags->aulPropTag[N_MAIL3TYPE		], PT_TSTRING );
	pr_mail3dispname				= SetPropType( pContactTags->aulPropTag[N_MAIL3DISPNAME	], PT_TSTRING );
	pr_fileas						= SetPropType( pContactTags->aulPropTag[N_FILEAS		], PT_TSTRING );
	pr_fileasID						= SetPropType( pContactTags->aulPropTag[N_FILEAS_ID		], PT_LONG );
	pr_business_address_city		= SetPropType( pContactTags->aulPropTag[N_BUS_CITY		], PT_TSTRING );
	pr_business_address_country		= SetPropType( pContactTags->aulPropTag[N_BUS_COUNTRY	], PT_TSTRING );
	pr_business_address_postal_code = SetPropType( pContactTags->aulPropTag[N_BUS_ZIP		], PT_TSTRING );
	pr_business_address_state		= SetPropType( pContactTags->aulPropTag[N_BUS_STATE		], PT_TSTRING );
	pr_business_address_street		= SetPropType( pContactTags->aulPropTag[N_BUS_STREET	], PT_TSTRING );
	pr_contact_user1_idx            = SetPropType( pContactTags->aulPropTag[N_CONTACT_USER1_IDX	], PT_TSTRING );
    pr_contact_user2_idx            = SetPropType( pContactTags->aulPropTag[N_CONTACT_USER2_IDX	], PT_TSTRING );
    pr_contact_user3_idx            = SetPropType( pContactTags->aulPropTag[N_CONTACT_USER3_IDX	], PT_TSTRING );
    pr_contact_user4_idx            = SetPropType( pContactTags->aulPropTag[N_CONTACT_USER4_IDX	], PT_TSTRING );
	pr_contact_oneoffmemebrs        = SetPropType( pContactTags->aulPropTag[N_CONTACT_ONEOFFMEMEBRS_IDX], PT_MV_BINARY );
	pr_imaddress			        = SetPropType( pContactTags->aulPropTag[N_IMADDRESS], PT_TSTRING );
	
	//free the memory we allocated on the head
	for( int i = 0; i < N_NUM_NAMES; i++ )
		MAPIFreeBuffer( ppNames[i] );
	MAPIFreeBuffer( pContactTags );

	//these are the contact properties we need to get
	SizedSPropTagArray( C_NUM_PROPS, contactProps ) = 
	{
		C_NUM_PROPS,
		{
			PR_CALLBACK_TELEPHONE_NUMBER,
			PR_CAR_TELEPHONE_NUMBER,
			PR_COMPANY_NAME,
			pr_mail1address,
			pr_mail1entryid,
			pr_mail1type,
			pr_mail1dispname,
			pr_mail2address,
			pr_mail2entryid,
			pr_mail2type,
			pr_mail2dispname,
			pr_mail3address,
			pr_mail3entryid,
			pr_mail3type,
			pr_mail3dispname,
			pr_fileas,
			pr_fileasID,
			PR_GIVEN_NAME,
			PR_HOME_ADDRESS_CITY,
			PR_HOME_ADDRESS_COUNTRY,
			PR_HOME_FAX_NUMBER,
			PR_HOME_TELEPHONE_NUMBER,
			PR_HOME2_TELEPHONE_NUMBER,
			PR_HOME_ADDRESS_POSTAL_CODE,
			PR_HOME_ADDRESS_STATE_OR_PROVINCE,
			PR_HOME_ADDRESS_STREET,
			PR_TITLE,
			PR_SURNAME,
			PR_MIDDLE_NAME,
			PR_CELLULAR_TELEPHONE_NUMBER,
			PR_DISPLAY_NAME_PREFIX,
			PR_GENERATION,
			//notes is PR_BODY and PR_BODY_HTML
			PR_OTHER_ADDRESS_CITY,
			PR_OTHER_ADDRESS_COUNTRY,
			PR_PRIMARY_FAX_NUMBER, //other fax
			PR_OTHER_TELEPHONE_NUMBER,
			PR_OTHER_ADDRESS_POSTAL_CODE,
			PR_OTHER_ADDRESS_STATE_OR_PROVINCE,
			PR_OTHER_ADDRESS_STREET,
			PR_PAGER_TELEPHONE_NUMBER,
			pr_business_address_city,
			pr_business_address_country,
			PR_BUSINESS_FAX_NUMBER,
			PR_OFFICE_TELEPHONE_NUMBER,
			pr_business_address_postal_code,
			pr_business_address_state,
			pr_business_address_street,
			PR_BUSINESS_HOME_PAGE,
            PR_BIRTHDAY,
            pr_contact_user1_idx,
            pr_contact_user2_idx,
            pr_contact_user3_idx,
            pr_contact_user4_idx,
            pr_contact_oneoffmemebrs,
			pr_imaddress
		}
	};

	ULONG cVals = 0;
	hr = m_pMessage->GetProps( (LPSPropTagArray)&contactProps, fMapiUnicode, &cVals, &m_pPropVals );
	if( FAILED(hr) )
		return hr;
	

	//see if there is a file-as id
	LONG zimbraFileAsId = 0;
    if( m_bPersonalDL )//PDL's always have a custom file-as
    {
        zimbraFileAsId = 8 ;
    }
	else if( m_pPropVals[C_FILEASID].ulPropTag == contactProps.aulPropTag[C_FILEASID] )
	{
		switch( m_pPropVals[C_FILEASID].Value.l )
		{
			case OFA_LAST_C_FIRST:
				zimbraFileAsId = 1;
				break;
			case OFA_FIRST_LAST:
				zimbraFileAsId = 2;
				break;
			case OFA_COMPANY:
				zimbraFileAsId = 3;
				break;
			case OFA_LAST_C_FIRST_COMPANY:
				zimbraFileAsId = 4;
				break;
			case OFA_COMPANY_LAST_C_FIRST:
				zimbraFileAsId = 6;
				break;
			case OFA_CUSTOM:
				zimbraFileAsId = 8;
				break;
		}
	}
	//process all "String" properties
	if( m_pPropVals[C_CALLBACK_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_CALLBACK_TELEPHONE_NUMBER] )
		CallbackPhone( m_pPropVals[C_CALLBACK_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_CAR_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_CAR_TELEPHONE_NUMBER] )
		CarPhone( m_pPropVals[C_CAR_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_COMPANY_NAME].ulPropTag == contactProps.aulPropTag[C_COMPANY_NAME] )
		Company( m_pPropVals[C_COMPANY_NAME].Value.lpszW );

	if( m_pPropVals[C_FILEAS].ulPropTag == contactProps.aulPropTag[C_FILEAS] )
	{
		if( zimbraFileAsId == 8 )
		{
            LPWSTR pwszFileAsValue = m_pPropVals[C_FILEAS].Value.lpszW;
            if((pwszFileAsValue != NULL)&&(wcsicmp(pwszFileAsValue, L"") != 0)) {
    			LPWSTR pwszTemp = new WCHAR[ wcslen(m_pPropVals[C_FILEAS].Value.lpszW) + 3 ];
                // there is a legit string for the custom fileas value
			    wsprintf( pwszTemp, L"8:%s", pwszFileAsValue );
			    FileAs( pwszTemp );
                //PDL's require a nickname
                if( m_bPersonalDL )
                {
                    NickName( m_pPropVals[C_FILEAS].Value.lpszW ) ;
                }
    			delete [] pwszTemp;
            }
			else
			{
				LPWSTR pwszNONAME= new WCHAR[ wcslen(L"NO_NAME") +1];
				wsprintf( pwszNONAME, L"%s", L"NO_NAME" );
				LPWSTR pwszTemp = new WCHAR[ wcslen(pwszNONAME) + 3 ];
                // there is a legit string for the custom fileas value
			    wsprintf( pwszTemp, L"8:%s", pwszNONAME );
			    FileAs( pwszTemp );
                //PDL's require a nickname
                if( m_bPersonalDL )
                {
                    NickName( pwszNONAME ) ;
                }
    			delete [] pwszTemp;
				delete [] pwszNONAME;
			}
		}
		else if( zimbraFileAsId )
		{
			WCHAR pwszTemp[3];
			_ltow( zimbraFileAsId, pwszTemp, 10 );
			FileAs( pwszTemp );
		}
	}
	if( m_pPropVals[C_GIVEN_NAME].ulPropTag == contactProps.aulPropTag[C_GIVEN_NAME] )
		FirstName( m_pPropVals[C_GIVEN_NAME].Value.lpszW );

	if( m_pPropVals[C_HOME_ADDRESS_CITY].ulPropTag == contactProps.aulPropTag[C_HOME_ADDRESS_CITY] )
		HomeCity( m_pPropVals[C_HOME_ADDRESS_CITY].Value.lpszW );
	
	if( m_pPropVals[C_HOME_ADDRESS_COUNTRY].ulPropTag == contactProps.aulPropTag[C_HOME_ADDRESS_COUNTRY] )
		HomeCountry( m_pPropVals[C_HOME_ADDRESS_COUNTRY].Value.lpszW );

	if( m_pPropVals[C_HOME_FAX_NUMBER].ulPropTag == contactProps.aulPropTag[C_HOME_FAX_NUMBER] )
		HomeFax( m_pPropVals[C_HOME_FAX_NUMBER].Value.lpszW );

	if( m_pPropVals[C_HOME_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_HOME_TELEPHONE_NUMBER] )
		HomePhone( m_pPropVals[C_HOME_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_HOME2_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_HOME2_TELEPHONE_NUMBER] )
		HomePhone2( m_pPropVals[C_HOME2_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_HOME_ADDRESS_POSTAL_CODE].ulPropTag == contactProps.aulPropTag[C_HOME_ADDRESS_POSTAL_CODE] )
		HomePostalCode( m_pPropVals[C_HOME_ADDRESS_POSTAL_CODE].Value.lpszW );

	if( m_pPropVals[C_HOME_ADDRESS_STATE_OR_PROVINCE].ulPropTag == contactProps.aulPropTag[C_HOME_ADDRESS_STATE_OR_PROVINCE] )
		HomeState( m_pPropVals[C_HOME_ADDRESS_STATE_OR_PROVINCE].Value.lpszW );

	if( m_pPropVals[C_HOME_ADDRESS_STREET].ulPropTag == contactProps.aulPropTag[C_HOME_ADDRESS_STREET] )
		HomeStreet( m_pPropVals[C_HOME_ADDRESS_STREET].Value.lpszW );

	if( m_pPropVals[C_TITLE].ulPropTag == contactProps.aulPropTag[C_TITLE] )
		JobTitle( m_pPropVals[C_TITLE].Value.lpszW );

	if( m_pPropVals[C_SURNAME].ulPropTag == contactProps.aulPropTag[C_SURNAME] )
		LastName( m_pPropVals[C_SURNAME].Value.lpszW );

	if( m_pPropVals[C_MIDDLE_NAME].ulPropTag == contactProps.aulPropTag[C_MIDDLE_NAME] )
		MiddleName( m_pPropVals[C_MIDDLE_NAME].Value.lpszW );

	if( m_pPropVals[C_CELLULAR_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_CELLULAR_TELEPHONE_NUMBER] )
		MobilePhone( m_pPropVals[C_CELLULAR_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_DISPLAY_NAME_PREFIX].ulPropTag == contactProps.aulPropTag[C_DISPLAY_NAME_PREFIX] )
		NamePrefix( m_pPropVals[C_DISPLAY_NAME_PREFIX].Value.lpszW );

	if( m_pPropVals[C_GENERATION].ulPropTag == contactProps.aulPropTag[C_GENERATION] )
		NameSuffix( m_pPropVals[C_GENERATION].Value.lpszW );

	if( m_pPropVals[C_OTHER_ADDRESS_CITY].ulPropTag == contactProps.aulPropTag[C_OTHER_ADDRESS_CITY] )
		OtherCity( m_pPropVals[C_OTHER_ADDRESS_CITY].Value.lpszW );

	if( m_pPropVals[C_OTHER_ADDRESS_COUNTRY].ulPropTag == contactProps.aulPropTag[C_OTHER_ADDRESS_COUNTRY] )
		OtherCountry( m_pPropVals[C_OTHER_ADDRESS_COUNTRY].Value.lpszW );

	if( m_pPropVals[C_PRIMARY_FAX_NUMBER].ulPropTag == contactProps.aulPropTag[C_PRIMARY_FAX_NUMBER] )
		OtherFax( m_pPropVals[C_PRIMARY_FAX_NUMBER].Value.lpszW );

	if( m_pPropVals[C_OTHER_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_OTHER_TELEPHONE_NUMBER] )
		OtherPhone( m_pPropVals[C_OTHER_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_OTHER_ADDRESS_POSTAL_CODE].ulPropTag == contactProps.aulPropTag[C_OTHER_ADDRESS_POSTAL_CODE] )
		OtherPostalCode( m_pPropVals[C_OTHER_ADDRESS_POSTAL_CODE].Value.lpszW );

	if( m_pPropVals[C_OTHER_ADDRESS_STATE_OR_PROVINCE].ulPropTag == contactProps.aulPropTag[C_OTHER_ADDRESS_STATE_OR_PROVINCE] )
		OtherState( m_pPropVals[C_OTHER_ADDRESS_STATE_OR_PROVINCE].Value.lpszW );

	if( m_pPropVals[C_OTHER_ADDRESS_STREET].ulPropTag == contactProps.aulPropTag[C_OTHER_ADDRESS_STREET] )
		OtherStreet( m_pPropVals[C_OTHER_ADDRESS_STREET].Value.lpszW );

	if( m_pPropVals[C_PAGER_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_PAGER_TELEPHONE_NUMBER] )
		Pager( m_pPropVals[C_PAGER_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_ADDRESS_CITY].ulPropTag == contactProps.aulPropTag[C_BUSINESS_ADDRESS_CITY] )
		WorkCity( m_pPropVals[C_BUSINESS_ADDRESS_CITY].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_ADDRESS_COUNTRY].ulPropTag == contactProps.aulPropTag[C_BUSINESS_ADDRESS_COUNTRY] )
		WorkCountry( m_pPropVals[C_BUSINESS_ADDRESS_COUNTRY].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_FAX_NUMBER].ulPropTag == contactProps.aulPropTag[C_BUSINESS_FAX_NUMBER] )
		WorkFax( m_pPropVals[C_BUSINESS_FAX_NUMBER].Value.lpszW );

	if( m_pPropVals[C_OFFICE_TELEPHONE_NUMBER].ulPropTag == contactProps.aulPropTag[C_OFFICE_TELEPHONE_NUMBER] )
		WorkPhone( m_pPropVals[C_OFFICE_TELEPHONE_NUMBER].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_ADDRESS_POSTAL_CODE].ulPropTag == contactProps.aulPropTag[C_BUSINESS_ADDRESS_POSTAL_CODE] )
		WorkPostalCode( m_pPropVals[C_BUSINESS_ADDRESS_POSTAL_CODE].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_ADDRESS_STATE].ulPropTag == contactProps.aulPropTag[C_BUSINESS_ADDRESS_STATE] )
		WorkState( m_pPropVals[C_BUSINESS_ADDRESS_STATE].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_ADDRESS_STREET].ulPropTag == contactProps.aulPropTag[C_BUSINESS_ADDRESS_STREET] )
		WorkStreet( m_pPropVals[C_BUSINESS_ADDRESS_STREET].Value.lpszW );

	if( m_pPropVals[C_BUSINESS_HOME_PAGE].ulPropTag == contactProps.aulPropTag[C_BUSINESS_HOME_PAGE] )
		WorkURL( m_pPropVals[C_BUSINESS_HOME_PAGE].Value.lpszW );

    if( m_pPropVals[C_CONTACT_USER1_IDX].ulPropTag == contactProps.aulPropTag[C_CONTACT_USER1_IDX] )
		UserField1( m_pPropVals[C_CONTACT_USER1_IDX].Value.lpszW );

    if( m_pPropVals[C_CONTACT_USER2_IDX].ulPropTag == contactProps.aulPropTag[C_CONTACT_USER2_IDX] )
		UserField2( m_pPropVals[C_CONTACT_USER2_IDX].Value.lpszW );

    if( m_pPropVals[C_CONTACT_USER3_IDX].ulPropTag == contactProps.aulPropTag[C_CONTACT_USER3_IDX] )
		UserField3( m_pPropVals[C_CONTACT_USER3_IDX].Value.lpszW );

    if( m_pPropVals[C_CONTACT_USER4_IDX].ulPropTag == contactProps.aulPropTag[C_CONTACT_USER4_IDX] )
		UserField4( m_pPropVals[C_CONTACT_USER4_IDX].Value.lpszW );

	if( m_pPropVals[C_BIRTHDAY].ulPropTag == contactProps.aulPropTag[C_BIRTHDAY] )
    {
        SYSTEMTIME st = { 0 } ;
        
		FileTimeToSystemTime( &(m_pPropVals[C_BIRTHDAY].Value.ft), &st ) ;

        //We get PR_BIRTHDAY in UTC so let's convert it into local time 
        TIME_ZONE_INFORMATION tzInfo = { 0 } ;
        GetTimeZoneInformation( &tzInfo ) ;
        SystemTimeToTzSpecificLocalTime( &tzInfo, &st, &st ) ;

		TCHAR pszBDay[11] ;
		swprintf( pszBDay,11,_T("%4d-%02d-%02d"), st.wYear, st.wMonth, st.wDay ) ;

        Birthday( pszBDay );
    }
	//email 1
	RECIP_INFO tempRecip;

	if( m_pPropVals[C_MAIL1TYPE].ulPropTag == contactProps.aulPropTag[C_MAIL1TYPE] &&
		m_pPropVals[C_MAIL1ADDRESS].ulPropTag == contactProps.aulPropTag[C_MAIL1ADDRESS] 	)
	{
		if( wcscmp(m_pPropVals[C_MAIL1TYPE].Value.lpszW, L"SMTP") == 0 )
		{
			Email( m_pPropVals[C_MAIL1ADDRESS].Value.lpszW );
		}
		else if(wcscmp(m_pPropVals[C_MAIL1TYPE].Value.lpszW, L"EX") == 0 )
		{
			tempRecip.pAddrType		= m_pPropVals[C_MAIL1TYPE].Value.lpszW;
			tempRecip.pEmailAddr	= m_pPropVals[C_MAIL1ADDRESS].Value.lpszW;
			tempRecip.cbEid			= m_pPropVals[C_MAIL1EID].Value.bin.cb;
			tempRecip.pEid			= (LPENTRYID)(m_pPropVals[C_MAIL1EID].Value.bin.lpb);

			wstring strSenderEmail(_TEXT(""));
			HRESULT hr = E_FAIL;//HrMAPIGetSMTPAddress( _session, tempRecip, strSenderEmail );
			if(hr!=S_OK)
			{
				Email(m_pPropVals[C_MAIL1DISPNAME].Value.lpszW);
			}
			else
			{
				Email( (LPTSTR)strSenderEmail.c_str() );
			}
		}
	}

	//email 2
	if( m_pPropVals[C_MAIL2TYPE].ulPropTag == contactProps.aulPropTag[C_MAIL2TYPE] &&
		m_pPropVals[C_MAIL2ADDRESS].ulPropTag == contactProps.aulPropTag[C_MAIL2ADDRESS] 	)
	{
		if( wcscmp(m_pPropVals[C_MAIL2TYPE].Value.lpszW, L"SMTP") == 0 )
		{
			Email2( m_pPropVals[C_MAIL2ADDRESS].Value.lpszW );
		}
		else if(wcscmp(m_pPropVals[C_MAIL2TYPE].Value.lpszW, L"EX") == 0 )
		{
			tempRecip.pAddrType		= m_pPropVals[C_MAIL2TYPE].Value.lpszW;
			tempRecip.pEmailAddr	= m_pPropVals[C_MAIL2ADDRESS].Value.lpszW;
			tempRecip.cbEid			= m_pPropVals[C_MAIL2EID].Value.bin.cb;
			tempRecip.pEid			= (LPENTRYID)(m_pPropVals[C_MAIL2EID].Value.bin.lpb);

			wstring strSenderEmail(_TEXT(""));
			HRESULT hr = E_FAIL;//HrMAPIGetSMTPAddress( _session, tempRecip, strSenderEmail );
			if(hr!=S_OK)
			{
				Email(m_pPropVals[C_MAIL2DISPNAME].Value.lpszW);
			}
			else
			{
				Email2( (LPTSTR)strSenderEmail.c_str() );
			}
		}
	}

	//email 3
	if( m_pPropVals[C_MAIL3TYPE].ulPropTag == contactProps.aulPropTag[C_MAIL3TYPE] &&
		m_pPropVals[C_MAIL3ADDRESS].ulPropTag == contactProps.aulPropTag[C_MAIL3ADDRESS] 	)
	{
		if( wcscmp(m_pPropVals[C_MAIL3TYPE].Value.lpszW, L"SMTP") == 0 )
		{
			Email3( m_pPropVals[C_MAIL3ADDRESS].Value.lpszW );
		}
		else if(wcscmp(m_pPropVals[C_MAIL3TYPE].Value.lpszW, L"EX") == 0 )
		{
			tempRecip.pAddrType		= m_pPropVals[C_MAIL3TYPE].Value.lpszW;
			tempRecip.pEmailAddr	= m_pPropVals[C_MAIL3ADDRESS].Value.lpszW;
			tempRecip.cbEid			= m_pPropVals[C_MAIL3EID].Value.bin.cb;
			tempRecip.pEid			= (LPENTRYID)(m_pPropVals[C_MAIL3EID].Value.bin.lpb);

			wstring strSenderEmail(_TEXT(""));
			HRESULT hr = E_FAIL;//HrMAPIGetSMTPAddress( _session, tempRecip, strSenderEmail );
			if(hr!=S_OK)
			{
				Email(m_pPropVals[C_MAIL3DISPNAME].Value.lpszW);
			}
			else
			{
				Email3( (LPTSTR)strSenderEmail.c_str() );
			}
		}

	}

	if( m_pPropVals[C_IMADDRESS].ulPropTag == contactProps.aulPropTag[C_IMADDRESS] )
		IMAddress1( m_pPropVals[C_IMADDRESS].Value.lpszW );
	
	return S_OK;
}