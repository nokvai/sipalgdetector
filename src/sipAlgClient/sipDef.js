// iSipDef.js
// SIP Definitions

let pkg = {
    title: "unknown",
    version: "0.0.0"
};

/*
 Timer 		Default Value 		RFC 3261 Section 	Meaning
 ---------- ------------------- ------------------- --------------------------------------------------------------------
 T1 		500 milliseconds 	17.1.1.1 			RTT Estimate
 T2 		4 seconds 			17.1.2.2 			Maximum retransmit interval for non-INVITE requests and INVITE responses
 T4 		5 seconds 			17.1.2.2 			Maximum duration that a message remains in the network
 Timer A 	T1 					17.1.1.2 			INVITE request retransmit interval, for UDP only
 Timer B 	64*T1 				17.1.1.2 			INVITE transaction timeout timer
 Timer C 	> 3 minutes 		16.6 (bullet 11) 	Proxy INVITE transaction timeout
 Timer D 	> 32 seconds for UDP 17.1.1.2			Wait time for response retransmits
            0 for TCP/SCTP
 Timer E 	T1 					17.1.2.2 			Non-INVITE request retransmit interval, for UDP only
 Timer F 	64 * T1				17.1.2.2 			Non-INVITE transaction timeout timer
 Timer G 	T4 for UDP,			17.2.17 			INVITE response retransmit interval
            0 for TCP/SCTP
 Timer H 	64 * T1 			17.2.1 				Wait time for ACK receipt
 Timer I 	T4 for UDP,			17.2.1 				Wait time for ACK retransmits
            0 for TCP/SCTP
 Timer J 	64 * T1 for UDP, 	17.2.2 				Wait time for non-INVITE request retransmits
            0 for TCP/SCTP
 Timer K 	T4 for UDP, 		17.1.2.2 			Wait time for response retransmits
            0 for TCP/SCTP
 */

module.exports = {

    SUCCESS:    0,
    FAIL:       1,
    RETRANSMIT: 2,

    USER_AGENT: pkg.title + ' ' + pkg.version,

    // SIP scheme
    SIP: 'sip',
    SIPS: 'sips',

    // Transport protocols
    UDP: 'UDP',
    TCP: 'TCP',
    TLS: 'TLS',
    WS: 'WS',
    WSS: 'WSS',

    T1: 500,
    T2: 4000,
    T4: 5000,

    SIP_VERSION: '2.0',

    // SIP Methods
    ACK:        'ACK',
    BYE:        'BYE',
    CANCEL:     'CANCEL',
    INFO:       'INFO',
    INVITE:     'INVITE',
    REINVITE:   'REINVITE',
    MESSAGE:    'MESSAGE',
    NOTIFY:     'NOTIFY',
    OPTIONS:    'OPTIONS',
    REGISTER:   'REGISTER',
    UPDATE:     'UPDATE',
    REFER:      'REFER',
    SUBSCRIBE:  'SUBSCRIBE',

    // SIP headers
    H_CALL_ID:          'call-id',
    H_CSEQ :            'cseq',
    H_CONTACT:          'contact',
    H_FROM:             'from',
    H_TO:               'to',
    H_VIA:              'via',
    H_ROUTE:            'route',
    H_RECORD_ROUTE:     'record-route',
    H_USER_AGENT:       'user-agent',
    H_CONTENT_TYPE:     'content-type',
    H_CONTENT_LENGTH:   'content-length',

    compactForm: {
        i: 'call-id',
        m: 'contact',
        e: 'contact-encoding',
        l: 'content-length',
        c: 'content-type',
        f: 'from',
        s: 'subject',
        k: 'supported',
        t: 'to',
        v: 'via'
    },

    // Transaction types
    UP:         "UP",
    DOWN:       "DOWN",
    SERVER:     "SERVER",
    CLIENT:     "CLIENT",

    // Transaction states
    SIP_TS_IDLE:                                "IDLE",

    // Client.
    SIP_TS_CALLING:                             "CLIENT_CALLING",
    SIP_TS_CALL_TRYING:                         "CLIENT_CALL_TRYING",
    SIP_TS_CALL_PROCEEDING:                     "CLIENT_CALL_PROCEEDING",
    SIP_TS_RECEIVED_FINAL_ANSWER_TO_INVITE:     "CLIENT_RECEIVED_FINAL_ANSWER_TO_INVITE",
    SIP_TS_CONFIRMING:                          "CLIENT_CONFIRMING",

    // Server.
    SIP_TS_REQUEST_RECEIVED:                    "SERVER_REQUEST_RECEIVED",
    SIP_TS_PROCEEDING:                          "SERVER_PROCEEDING",
    SIP_TS_SUCCESS:                             "SERVER_SUCCESS",
    SIP_TS_FAILURE:                             "SERVER_FAILURE",
    SIP_TS_CONFIRMED:                           "SERVER_CONFIRMED",

    SIP_TS_COMPLETED:                           "COMPLETED",
    SIP_TS_TERMINATED:                          "TERMINATED",

    // Dialog states
    SIP_DIALOG_IDLE:                            "DIALOG_IDLE",
    SIP_DIALOG_PLACED_CALL:                     "DIALOG_PLACED_CALL",
    SIP_DIALOG_OFFERED:                         "DIALOG_OFFERED",
    SIP_DIALOG_ACCEPTED:                        "DIALOG_ACCEPTED",
    SIP_DIALOG_RINGING:                         "DIALOG_RINGING",
    SIP_DIALOG_CONNECTED:                       "DIALOG_CONNECTED",
    SIP_DIALOG_CLEARING:                        "DIALOG_CLEARING",
    SIP_DIALOG_CLEARED:                         "DIALOG_CLEARED"
};

