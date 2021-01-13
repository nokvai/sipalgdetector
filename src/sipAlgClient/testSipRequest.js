// testRequest.js

const SipMessage = require('./sipMessage');
const def = require('./sipDef');
const SipSdp = require('./sipSdp');
const utils = require('./sipUtils');

class TestSipRequest {
    constructor(transport, srcIp, srcPort, dstIp, dstPort, testId, numberOfTries=3) {
        this.transport = transport;
        this.srcIp = srcIp;
        this.srcPort = srcPort;
        this.dstIp = dstIp;
        this.dstPort = dstPort;
        this.testId = testId;
        this.numberOfTries = numberOfTries;
        this.callback = null;
        this.waitForResponse = false;
        this.callId = null;
        this.startTime = 0;
        this.testNatSessionTimeout = false;
    }

    generateCallId(srcIp, srcPort) {
        return utils.randomHexString(8) + "@" + srcIp + ":" + srcPort;
    }

    generateTag() {
        return utils.randomHexString(8);
    }

    generateInvite(srcIp, srcPort, dstIp, dstPort, callId, delay=0) {
        const fromUser = this.testId;
        const toUser = "server";


        const invite = new SipMessage().createRequest(def.INVITE);
        invite.uri = SipMessage.sipUri(toUser, dstIp, dstPort);

        // Via
        let viaBranch = utils.generateBranchValue();
        invite.addTopHeader('via', {
            version: "2.0",
            protocol: "UDP",
            host: srcIp,
            port: srcPort,
            params: { branch: viaBranch}
        });

        // From
        invite.headers.from.name = fromUser;
        invite.headers.from.uri = SipMessage.sipUri(fromUser, srcIp, srcPort);
        invite.headers.from.params.tag = this.generateTag();

        // To
        invite.headers.to.uri = invite.uri;

        // Contact
        invite.headers.contact.push({
            name: fromUser,
            uri: invite.headers.from.uri,
            params: {}
        });

        // Call-Id
        invite.headers[def.H_CALL_ID] = callId;

        invite.headers.cseq.seq = utils.getRandomInt(1000, 10000);

        invite.headers[def.H_USER_AGENT] = "SIP ALG Test Client";

        //invite.headers.allow = "ACK, BYE, CANCEL, INFO, INVITE, NOTIFY, OPTIONS, REFER, SUBSCRIBE, NOTIFY";

        const sourceAddress = srcIp + ":" + srcPort;
        invite.headers['P-AL-SA'] = sourceAddress.replace(/\./g, '*').replace(':', '#');

        if (delay > 0) {
            invite.headers['P-AL-Delay'] = delay.toString();
        }

        // SDP
        invite.headers[def.H_CONTENT_TYPE] = "application/sdp";

        let sdp = new SipSdp();
        sdp.build(srcIp, 30000, "0");
        invite.content = sdp.encode();

        return invite;
    };

    generateRegister(srcIp, srcPort, dstIp, dstPort, callId, delay=0) {
        const fromUser = "client";
        const toUser = "server";

        const register = new SipMessage().createRequest(def.REGISTER);
        register.uri = SipMessage.sipUri(toUser, dstIp, dstPort);

        // Via
        let viaBranch = utils.generateBranchValue();
        register.addTopHeader('via', {
            version: "2.0",
            protocol: "UDP",
            host: srcIp,
            port: srcPort,
            params: { branch: viaBranch}
        });

        // From
        register.headers.from.name = fromUser;
        register.headers.from.uri = SipMessage.sipUri(fromUser, srcIp, srcPort);
        register.headers.from.params.tag = this.generateTag();

        // To
        register.headers.to.uri = register.uri;

        // Contact
        register.headers.contact.push({
            name: fromUser,
            uri: register.headers.from.uri,
            params: {}
        });

        // Call-Id
        register.headers[def.H_CALL_ID] = callId;

        register.headers.cseq.seq = utils.getRandomInt(1000, 10000);

        register.headers[def.H_USER_AGENT] = "SIP ALG Test Client";

        const sourceAddress = srcIp + ":" + srcPort;
        register.headers['P-AL-SA'] = sourceAddress.replace(/\./g, '*').replace(':', '#');

        if (delay > 0) {
            register.headers['P-AL-Delay'] = delay.toString();
        }

        return register;
    };

    test(request, callback) {
        this.waitForResponse = true;
        this.startTime = Date.now();
        this.callback = callback;
        this.callId = this.generateCallId(this.srcIp, this.srcPort);
        let msg = null;
        if (request.toLowerCase() === "invite") {
            msg = this.generateInvite(this.srcIp, this.srcPort, this.dstIp, this.dstPort, this.callId);
        } else if (request.toLowerCase() === "register") {
            msg = this.generateRegister(this.srcIp, this.srcPort, this.dstIp, this.dstPort, this.callId);
        } else {
            msg = "\r\n\r\n"; // Keep Alive
        }
        this.transport.send(msg, this.dstIp, this.dstPort);

        // If still waiting for a response, retransmit every 1 sec
        for (let i=1; i<this.numberOfTries; i++) {
            setTimeout(() => {
                if (this.waitForResponse) {
                    this.transport.send(msg, this.dstIp, this.dstPort);
                }
            }, 1000*i);
        }

        // The final timeout after numberOfTries seconds.
        setTimeout(() => {
            if (this.waitForResponse) {
                this.waitForResponse = false;
                if (this.callback) {
                    this.callback("Failed. No response", Date.now() - this.startTime, "");
                }
            }
        }, 1000*this.numberOfTries);
    }

    testNat(request, delay, callback) {
        this.testNatSessionTimeout = true;
        this.waitForResponse = true;
        this.startTime = Date.now();
        this.callback = callback;
        this.callId = this.generateCallId(this.srcIp, this.srcPort);
        let msg = null;
        if (request.toLowerCase() === "invite") {
            msg = this.generateInvite(this.srcIp, this.srcPort, this.dstIp, this.dstPort, this.callId, delay);
        } else {
            msg = this.generateRegister(this.srcIp, this.srcPort, this.dstIp, this.dstPort, this.callId, delay);
        }

        // Send 3 times...
        this.transport.send(msg, this.dstIp, this.dstPort);
        this.transport.send(msg, this.dstIp, this.dstPort);
        this.transport.send(msg, this.dstIp, this.dstPort);

        // The final timeout after numberOfTries seconds.
        setTimeout(() => {
            if (this.waitForResponse) {
                this.waitForResponse = false;
                if (this.callback) {
                    this.callback("Timeout. NAT session timeout " + delay + " Seconds", Date.now() - this.startTime, "");
                }
            }
        }, 1000*(delay + 2));
    }

    onReceive(msg, ip, port, transport) {
        if (!this.waitForResponse) {
            return;
        }

        if (this.callId === null) {
            return;
        }

        if (typeof msg === 'string' && msg.charAt(0) === '\r' && msg.charAt(1) === '\n') {
            this.waitForResponse = false;
            if (this.callback) {
                this.callback("Pass", Date.now() - this.startTime, "");
            }
        }
        else if (msg.headers[def.H_CALL_ID] === this.callId) {
            this.waitForResponse = false;
            if (this.callback) {
                let result;
                if (this.testNatSessionTimeout) {
                    // When testing the NAT session timeout, we just want to get any response.
                    result = "Pass";
                } else {
                    result = msg.headers['p-al-result'];
                    if (result === undefined) {
                        result = "Failed. No P-AL-Result in response";
                    }
                }

                let publicAddress = msg.headers['p-al-sa'];
                if (publicAddress === undefined) {
                    publicAddress = "Unknown";
                } else {
                    publicAddress = publicAddress.replace(/\*/g, '.').replace('#', ':');
                }

                this.callback(result, Date.now() - this.startTime, publicAddress);
            }
        }
    }
}

module.exports = TestSipRequest;