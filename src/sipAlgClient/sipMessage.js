// SipMessage.js
// SIP Message decoding and encoding.

// The sip parse and stringify is based on sip.js module from:
// https://github.com/kirm/sip.js

/*
 Copyright (c) 2010 Kirill Mikhailov (kirill.mikhailov@gmail.com)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

"use strict";

const def = require('./sipDef');
//const _ = require('lodash');

////////////////////////////////////////////////
// Decoding (parse) functions
////////////////////////////////////////////////

function applyRegex(regex, data) {
    regex.lastIndex = data.i;
    let r = regex.exec(data.s);

    if (r && (r.index === data.i)) {
        data.i = regex.lastIndex;
        return r;
    }
}

function parseParams(data, hdr) {
    hdr.params = hdr.params || {};

    // original code
    //let re = /\s*;\s*([\w\-.!%*_+`'~]+)(?:\s*=\s*([\w\-.!%*_+`'~]+|"[^"\\]*(\\.[^"\\]*)*"))?/g;

    // Fix a bug where one of the params has a ':' for example param=1.2.3.4:5060
    let re = /\s*;\s*([\w\-.!%*_+`'~]+)(?:\s*=\s*([\w\-.!%*:_+`'~]+|"[^"\\]*(\\.[^"\\]*)*"))?/g;

    for (let r = applyRegex(re, data); r; r = applyRegex(re, data)) {
        hdr.params[r[1].toLowerCase()] = r[2];
    }

    return hdr;
}

function parseMultiHeader(parser, d, h) {
    h = h || [];

    let re = /\s*,\s*/g;
    do {
        h.push(parser(d));
    } while(d.i < d.s.length && applyRegex(re, d));

    return h;
}

function parseGenericHeader(d, h) {
    return h ? h + ',' + d.s : d.s;
}

function parseAOR(data) {
    let r = applyRegex(/((?:[\w\-.!%*_+`'~]+)(?:\s+[\w\-.!%*_+`'~]+)*|"[^"\\]*(?:\\.[^"\\]*)*")?\s*\<\s*([^>]*)\s*\>|((?:[^\s@"<]@)?[^\s;]+)/g, data);

    return parseParams(data, {name: r[1], uri: r[2] || r[3] || ''});
}

function parseAorWithUri(data) {
    let r = parseAOR(data);
    r.uri = parseUri(r.uri);
    return r;
}

function parseVia(data) {
    let r = applyRegex(/SIP\s*\/\s*(\d+\.\d+)\s*\/\s*([\S]+)\s+([^\s;:]+)(?:\s*:\s*(\d+))?/g, data);
    return parseParams(data, {version: r[1], protocol: r[2], host: r[3], port: r[4] && +r[4]});
}

function parseCSeq(d) {
    let r = /(\d+)\s*([\S]+)/.exec(d.s);
    return { seq: +r[1], method: decodeURIComponent(r[2]) };
}

function parseAuthHeader(d) {
    let r1 = applyRegex(/([^\s]*)\s+/g, d);
    let a = {scheme: r1[1]};

    let r2 = applyRegex(/([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d);
    a[r2[1]]=r2[2];

    while (r2 = applyRegex(/,\s*([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d)) {
        a[r2[1]]=r2[2];
    }

    return a;
}

function parseAuthenticationInfoHeader(d) {
    let a = {};
    let r = applyRegex(/([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d);
    a[r[1]]=r[2];

    while (r = applyRegex(/,\s*([^\s,"=]*)\s*=\s*([^\s,"]+|"[^"\\]*(?:\\.[^"\\]*)*")\s*/g, d)) {
        a[r[1]]=r[2];
    }
    return a;
}

/**
 * Parse URI
 * @param s URI string
 * @returns {*} {schema, user, password, host, port params, headers} - URI decoded object
 */
function parseUri(s) {
    if (typeof s === 'object')
        return s;

    let re = /^(sips?):(?:([^\s>:@]+)(?::([^\s@>]+))?@)?([\w\-\.]+)(?::(\d+))?((?:;[^\s=\?>;]+(?:=[^\s?\;]+)?)*)(?:\?(([^\s&=>]+=[^\s&=>]+)(&[^\s&=>]+=[^\s&=>]+)*))?$/;

    let r = re.exec(s);

    if (r) {
        let port = +r[5];
        if (isNaN(port))
        {
            port = 5060;
        }

        return {
            schema: r[1],
            user: r[2],
            password: r[3],
            host: r[4],
            port: port, // use to be: +r[5],
            params: (r[6].match(/([^;=]+)(=([^;=]+))?/g) || [])
                .map(function(s) { return s.split('='); })
                .reduce(function(params, x) { params[x[0]]=x[1] || null; return params;}, {}),
            headers: ((r[7] || '').match(/[^&=]+=[^&=]+/g) || [])
                .map(function(s){ return s.split('=') })
                .reduce(function(params, x) { params[x[0]]=x[1]; return params; }, {})
        }
    }
}

let parsers = {
    'to': parseAOR,
    'from': parseAOR,
    'contact': function(v, h) {
        if(v == '*')
            return v;
        else
            return parseMultiHeader(parseAOR, v, h);
    },
    'route': parseMultiHeader.bind(0, parseAorWithUri),
    'record-route': parseMultiHeader.bind(0, parseAorWithUri),
    'path': parseMultiHeader.bind(0, parseAorWithUri),
    'cseq': parseCSeq,
    'content-length': function(v) { return +v.s; },
    'via': parseMultiHeader.bind(0, parseVia),
    'www-authenticate': parseMultiHeader.bind(0, parseAuthHeader),
    'proxy-authenticate': parseMultiHeader.bind(0, parseAuthHeader),
    'authorization': parseMultiHeader.bind(0, parseAuthHeader),
    'proxy-authorization': parseMultiHeader.bind(0, parseAuthHeader),
    'authentication-info': parseAuthenticationInfoHeader,
    'refer-to': parseAOR
};

////////////////////////////////////////////////
// Encoding (stringify) functions
////////////////////////////////////////////////
function stringifyVersion(v) {
    return v || '2.0';
}

function stringifyParams(params) {
    let s = '';
    for (let n in params) {
        s += ';'+n+(params[n]?'='+params[n]:'');
    }

    return s;
}

function stringifyUri(uri) {
    if (typeof uri === 'string')
        return uri;

    let s = (uri.schema || 'sip') + ':';

    if (uri.user) {
        if(uri.password) {
            s += uri.user + ':' + uri.password + '@';
        } else {
            s += uri.user + '@';
        }
    }

    s += uri.host;

    if (uri.port) {
        s += ':' + uri.port;
    }

    if (uri.params) {
        s += stringifyParams(uri.params);
    }

    if (uri.headers) {
        let h = Object.keys(uri.headers).map(function(x){return x+'='+uri.headers[x];}).join('&');
        if (h.length) {
            s += '?' + h;
        }
    }
    return s;
}

function stringifyAOR(aor) {
    return (aor.name || '') + ' <' + stringifyUri(aor.uri) + '>'+stringifyParams(aor.params);
}

function stringifyAuthHeader(a) {
    let s = [];

    for (let n in a) {
        if(n !== 'scheme' && a[n] !== undefined) {
            s.push(n + '=' + a[n]);
        }
    }

    return a.scheme ? a.scheme + ' ' + s.join(',') : s.join(',');
}

let stringifiers = {
    via: function(h) {
        return h.map(function(via) {
            if(via.host) {
                return 'Via: SIP/'+stringifyVersion(via.version)+'/'+via.protocol.toUpperCase()+' '+via.host+(via.port?':'+via.port:'')+stringifyParams(via.params)+'\r\n';
            }
            else {
                return '';
            }
        }).join('');
    },
    to: function(h) {
        return 'To: '+stringifyAOR(h) + '\r\n';
    },
    from: function(h) {
        return 'From: '+stringifyAOR(h)+'\r\n';
    },
    contact: function(h) {
        //return 'Contact: '+ ((h !== '*' && h.length) ? h.map(stringifyAOR).join(', ') : '*') + '\r\n';
        return h.length ? 'Contact: '+ h.map(stringifyAOR).join(', ') + '\r\n' : '';
    },
    route: function(h) {
        return h.length ? 'Route: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
    },
    'record-route': function(h) {
        return h.length ? 'Record-Route: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
    },
    'path': function(h) {
        return h.length ? 'Path: ' + h.map(stringifyAOR).join(', ') + '\r\n' : '';
    },
    cseq: function(cseq) {
        return 'CSeq: '+cseq.seq+' '+cseq.method+'\r\n';
    },
    'www-authenticate': function(h) {
        return h.map(function(x) { return 'WWW-Authenticate: '+stringifyAuthHeader(x)+'\r\n'; }).join('');
    },
    'proxy-authenticate': function(h) {
        return h.map(function(x) { return 'Proxy-Authenticate: '+stringifyAuthHeader(x)+'\r\n'; }).join('');
    },
    'authorization': function(h) {
        return h.map(function(x) { return 'Authorization: ' + stringifyAuthHeader(x) + '\r\n'}).join('');
    },
    'proxy-authorization': function(h) {
        return h.map(function(x) { return 'Proxy-Authorization: ' + stringifyAuthHeader(x) + '\r\n'}).join('');
    },
    'authentication-info': function(h) {
        return 'Authentication-Info: ' + stringifyAuthHeader(h) + '\r\n';
    },
    'refer-to': function(h) { return 'Refer-To: ' + stringifyAOR(h) + '\r\n'; }
};

function prettifyHeaderName(s) {
    if (s === 'call-id') return 'Call-ID';

    return s.replace(/\b([a-z])/g, function(a) { return a.toUpperCase(); });
}

////////////////////////////////
// Cloning messages

function clone(o, deep) {
    if (typeof o === 'object') {
        let r = Array.isArray(o) ? [] : {};
        Object.keys(o).forEach(function(k) { r[k] = deep ? clone(o[k], deep): o[k]; });
        return r;
    }

    return o;
}

////////////////////////////////////////////////
// SipMessage class
////////////////////////////////////////////////
class SipMessage {

    constructor() {
        this.status = null;
        this.reason = null;
        this.version = '2.0';
        this.method = null;
        this.uri = null;
        this.content = null;
        this.headers = {};
    }

    msg() {
        return {
            status: this.status,
            reason: this.reason,
            version: this.version,
            method: this.method,
            uri: this.uri,
            headers: this.headers,
            content: this.content
        };
    }

    /**
     * Parse the response first line
     * @param rs response
     * @returns {*} this decoded message, or undefined (if failed)
     */
    parseResponse(rs) {
        let r = rs.match(/^SIP\/(\d+\.\d+)\s+(\d+)\s*(.*)\s*$/);

        if (r) {
            this.version = r[1];
            this.status = +r[2];
            this.reason = r[3];
            return this;
        } else {
            return undefined;
        }
    }

    /**
     * Parse the request first line
     * @param rq request
     * @returns {*} decodec message, or undefined (if failed)
     */
    parseRequest(rq) {
        let r = rq.match(/^([\w\-.!%*_+`'~]+)\s([^\s]+)\sSIP\s*\/\s*(\d+\.\d+)/);

        if (r) {
            this.method = decodeURIComponent(r[1]);
            this.uri = r[2];
            this.version = r[3];
            return this;
        } else {
            return undefined;
        }
    }

    /**
     * Parse the SIP message
     * @param data sip message string
     * @returns {boolean} status - true if successful, false if failed
     */
    parse(data) {
        data = data.split(/\r\n(?![ \t])/);

        if (data[0] === '')
            return false;

        if (!(this.parseResponse(data[0]) || this.parseRequest(data[0])))
            return false;

        this.headers = {};

        for(let i = 1; i < data.length; ++i) {
            let r = data[i].match(/^([\S]*?)\s*:\s*([\s\S]*)$/);
            if(!r) {
                return false;
            }

            let name = decodeURIComponent(r[1]).toLowerCase();
            name = def.compactForm[name] || name;

            this.headers[name] = (parsers[name] || parseGenericHeader)({s:r[2], i:0}, this.headers[name]);
        }

        return true;
    }

    /**
     * Parse the SIP message
     * Creates a new SipMessage object when the parsing is successful
     * @param s sip message string
     * @returns {boolean} true if successful or false if failed
     */
    decodeSip(s) {
        let r = s.match(/^\s*([\S\s]*?)\r\n\r\n([\S\s]*)$/);
        //let r = s.toString('ascii').match(/^\s*([\S\s]*?)\r\n([\S\s]*)$/);
        if (r) {
            let result = this.parse(r[1]);

            if (result) {
                if (this.headers['content-length']) {
                    let c = Math.max(0, Math.min(this.headers['content-length'], r[2].length));
                    this.content = r[2].substring(0, c);
                } else {
                    this.content = r[2];
                }

                return true;
            }
        } else {
            return false;
        }
    };

    /**
     * Checks if the message has the minimum headers
     * @returns {*|boolean|{}|parseAOR|stringifiers.to|Function}
     */
    checkMessage() {
        return (this.method || (this.status >= 100 && this.status <= 999)) &&
            this.headers &&
            Array.isArray(this.headers.via) &&
            this.headers.via.length > 0 &&
            this.headers['call-id'] &&
            this.headers.to &&
            this.headers.from &&
            this.headers.cseq;
    };

    /**
     * Encode the sip message into a string
     * @returns {string} the encoded sip message
     */
    encodeSip() {
        let s;
        if (this.status) {
            s = 'SIP/' + stringifyVersion(this.version) + ' ' + this.status + ' ' + this.reason + '\r\n';
        } else {
            s = this.method + ' ' + stringifyUri(this.uri) + ' SIP/' + stringifyVersion(this.version) + '\r\n';
        }

        this.headers['content-length'] = (this.content || '').length;

        for (let n in this.headers) {
            if (typeof this.headers[n] !== "undefined") {
                if (typeof this.headers[n] === 'string' || !stringifiers[n]) {
                    s += prettifyHeaderName(n) + ': ' + this.headers[n] + '\r\n';
                } else {
                    s += stringifiers[n](this.headers[n], n);
                }
            }
        }

        s += '\r\n';

        if (this.content) {
            s += this.content;
        }

        return s;
    };

    /**
     * Add a top header to a header array such as Via, Contact, Route, Record-Route etc.
     * @param headerName the header name, suce as 'Via'
     * @param headerValue the header value/content
     */
    addTopHeader(headerName, headerValue) {
        if (this.headers[headerName] === undefined) {
            this.headers[headerName] = [];
        }

        this.headers[headerName].unshift(headerValue);
    };

    /**
     * Add a bottom header to a header array such as Via, Contact, Route, Record-Route etc.
     * @param headerName the header name, suce as 'Via'
     * @param headerValue the header value/content
     */
    addBottomHeader(headerName, headerValue) {
        if (this.headers[headerName] === undefined) {
            this.headers[headerName] = [];
        }

        this.headers[headerName].push(headerValue);
    };

    static sipUri(user, host, port) {
        return "sip:" +
                ((user && user !== "") ? (user + "@") : "") + host +
                ((port && port !== 0) ? (":" + port) : "");
    };

    static decodeUri(s) {
        return parseUri(s);
    }

    /**
     * Create a request skeleton
     * @param method
     * @param uri
     */
    createRequest(method, uri) {
        this.method = method;
        this.uri = uri;
        this.version = "2.0";

        this.headers = {};
        this.headers.via = [];

        this.headers.from = {
            name: "",
            uri: "",
            params: {
                tag: ""
            }
        };

        this.headers.to = {
            name: "",
            uri: "",
            params: {}
        };

        this.headers.contact = [];

        this.headers["call-id"] = "";

        this.headers.cseq = {
            "seq": 0,
            method: method
        };

        this.headers["max-forwards"] = 70;

        this.headers["content-length"] = 0;

        this.content = "";

        return this;
    };

    // Generate a response to a request by copying only essentials headers
    createResponseTo(request, status, reason) {
        this.status = status;
        this.reason = reason;
        this.version = request.version;

        this.headers = {};

        this.headers.via = request.headers.via;
        this.headers.from = request.headers.from;
        this.headers.to = request.headers.to;
        this.headers.contact = [];
        this.headers['call-id'] = request.headers['call-id'];
        this.headers.cseq = request.headers.cseq;
        this.headers['content-length'] = "0";

        return this;
    };

    static copyMessage(msg, deep) {
        if (deep) return clone(msg, true);

        let r = {
            uri: deep ? clone(msg.uri, deep) : msg.uri,
            method: msg.method,
            status: msg.status,
            reason: msg.reason,
            headers: clone(msg.headers, deep),
            content: msg.content
        };

        // always copy via array
        r.headers.via = clone(msg.headers.via);

        return r;
    };

    /*this.copyMessage = function copyMessage(msg)
    {
        // TODO: assign doesn't work yet... replace with something else
        let copiedMsg = Object.assign({}, sip);

        return copiedMsg;
    };*/

    /*cloneSipMessage(source) {
        this.method = _.cloneDeep(source.method);
        this.uri = _.cloneDeep(source.uri);
        this.version = _.cloneDeep(source.version);
        this.headers = _.cloneDeep(source.headers);
        this.content = _.cloneDeep(source.content);

        return this;
    };*/

}

module.exports = SipMessage;
