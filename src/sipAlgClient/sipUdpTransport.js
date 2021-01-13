// sipUdpTransport.js

"use strict";

const {UdpTransport} = require('./udpTransport');
const SipMessage = require('./sipMessage.js');

const enableChrome = false;

class SipUdpTransport {
    constructor(ip, port, onReceive) {
        this.onReceive = onReceive;
        this.onUdpReceive = this.onUdpReceive.bind(this);

        this.udpTransport = new UdpTransport(ip, port, this.onUdpReceive);
    }

    start(callback) {
        return this.udpTransport.start(callback);
    }

    stop() {
        this.udpTransport.stop();
    }

    onUdpReceive(msg, ip, port, transport) {
        let msgString;

        if (enableChrome) {
            const view = new DataView(msg);
            msgString = "";
            for (let i = 0; i < msg.byteLength; i++) {
                msgString += String.fromCharCode(view.getInt8(i));
            }
        } else {
            msgString = msg.toString('ascii');
        }

        if (msgString.charAt(0) === '\r' && msgString.charAt(1) === '\n') {
            if (this.onReceive) {
                this.onReceive(msgString, ip, port, this);
            }
            return;
        }

        //console.log("msgString", msgString);

        let m = new SipMessage();
        if (m.decodeSip(msgString)) {
            if (this.onReceive) {
                this.onReceive(m, ip, port, this);
            }
        }
    }

    send(msg, ip, port) {
        let str;
        if (msg === "\r\n\r\n") {
            str = msg;
        } else {
            str = msg.encodeSip();
        }

        if (enableChrome) {
            let buf = new ArrayBuffer(str.length);
            let bufView = new Uint8Array(buf);
            for (let i = 0; i < str.length; i++) {
                bufView[i] = str.charCodeAt(i);
            }

            this.udpTransport.send(buf, ip, port);
        } else {
            this.udpTransport.send(str, ip, port);
        }
    }
}

module.exports = SipUdpTransport;