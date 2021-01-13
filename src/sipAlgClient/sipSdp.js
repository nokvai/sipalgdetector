// sipSdp.js

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

//import def from './sipDef';

const parsers = {
    o: function(o) {
        let t = o.split(/\s+/);
        return {
            username: t[0],
            id : t[1],
            version : t[2],
            nettype : t[3],
            addrtype : t[4],
            address : t[5]
        };
    },
    c: function(c) {
        let t = c.split(/\s+/);
        return { nettype: t[0], addrtype: t[1], address: t[2] };
    },
    m: function(m) {
        let t = /^(\w+) +(\d+)(?:\/(\d))? +(\S+) (\d+( +\d+)*)/.exec(m);

        return {
            media: t[1],
            port: +t[2],
            portnum: +(t[3] || 1),
            proto: t[4],
            fmt: t[5].split(/\s+/).map(function(x) { return +x; })
        };
    },
    a: function(a) {
        return a;
    }
};

const stringifiers = {
    o: function(o) {
        return [o.username || '-', o.id, o.version, o.nettype || 'IN', o.addrtype || 'IP4', o.address].join(' ');
    },
    c: function(c) {
        return [c.nettype || 'IN', c.addrtype || 'IP4', c.address].join(' ');
    },
    m: function(m) {
        return [m.media || 'audio', m.port, m.proto || 'RTP/AVP', m.fmt.join(' ')].join(' ');
    }
};

function stringifyParam(sdp, type, def) {
    if (sdp[type] !== undefined) {
        let stringifier = function(x) { return type + '=' + ((stringifiers[type] && stringifiers[type](x)) || x) + '\r\n'; };

        if (Array.isArray(sdp[type])) {
            return sdp[type].map(stringifier).join('');
        }

        return stringifier(sdp[type]);
    }

    if (def !== undefined) {
        return type + '=' + def + '\r\n';
    }

    return '';
}

class SipSdp {

    constructor() {
        this.headers = {};

        this.id = Math.floor(Math.random() * 10000000) + 1;
    };

    decode(msg) {
        msg = msg.split(/\r\n/);

        this.headers = {};
        let m;
        this.headers.m = [];

        for (let i = 0; i < msg.length; ++i) {
            let tmp = /^(\w)=(.*)/.exec(msg[i]);

            if (tmp) {

                let c = (parsers[tmp[1]] || function(x) { return x; })(tmp[2]);
                switch (tmp[1]) {
                    case 'm':
                        if (m) this.headers.m.push(m);
                        m = c;
                        break;
                    case 'a':
                        let o = (m || this.headers);
                        if (o.a === undefined) o.a = [];
                        o.a.push(c);
                        break;
                    default:
                        (m || this.headers)[tmp[1]] = c;
                        break;
                }
            }
        }

        if (m) this.headers.m.push(m);

        return this.headers;
    };

    encode() {
        let s = '';

        s += stringifyParam(this.headers, 'v', 0);
        s +=  stringifyParam(this.headers, 'o');
        s +=  stringifyParam(this.headers, 's', '-');
        s +=  stringifyParam(this.headers, 'i');
        s +=  stringifyParam(this.headers, 'u');
        s +=  stringifyParam(this.headers, 'e');
        s +=  stringifyParam(this.headers, 'p');
        s +=  stringifyParam(this.headers, 'c');
        s +=  stringifyParam(this.headers, 'b');
        s +=  stringifyParam(this.headers, 't', '0 0');
        s +=  stringifyParam(this.headers, 'r');
        s +=  stringifyParam(this.headers, 'z');
        s +=  stringifyParam(this.headers, 'k');
        s +=  stringifyParam(this.headers, 'a');
        this.headers.m.forEach(function(m) {
            s += stringifyParam({m:m}, 'm');
            s +=  stringifyParam(m, 'i');
            s +=  stringifyParam(m, 'c');
            s +=  stringifyParam(m, 'b');
            s +=  stringifyParam(m, 'k');
            s +=  stringifyParam(m, 'a');
        });

        return s;
    };

    build(ip, port, codecs) {
        // make sure codecs is an array of numbers
        if (Array.isArray(codecs) === false) {
            if (typeof codecs === 'string') {
                codecs = codecs.split(',').map(s => parseInt(s.trim()));
            } else if (typeof codecs === 'number') {
                codecs = [codecs];
            }
        }

        this.headers = {
            v: "0",
            o: {
                "username": "-",
                "id": this.id.toString(),
                "version": this.id.toString(),
                "nettype": "IN",
                "addrtype": ip.includes(":") ? "IP6" : "IP4",
                "address": ip
            },
            s: "-",
            c: {
                "nettype": "IN",
                "addrtype": ip.includes(":") ? "IP6" : "IP4",
                "address": ip
            },
            t: "0 0",
            m: [
                {
                    "media": "audio",
                    "port": port,
                    "portnum": 1,
                    "proto": "RTP/AVP",
                    "fmt": codecs,
                    "a": codecs.map(codec => {
                        switch (codec) {
                            case 0: return ["rtpmap:0 PCMU/8000"];
                            case 8: return ["rtpmap:0 PCMA/8000"];
                            case 9: return ["rtpmap:0 G722/8000"];
                            case 18: return ["rtpmap:18 G729a/8000"];
                            case 101: return ["rtpmap:101 telephone-event/8000", "fmtp:101 0-15"];
                        }
                    }).reduce((a,b) => a.concat(b)) // flatten array of arrays
                }
            ]
        }
    };
}

module.exports = SipSdp;
