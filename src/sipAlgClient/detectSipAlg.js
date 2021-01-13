// detectSipAlg.js

const {UdpTransport} = require('./udpTransport');
const SipUdpTransport = require('./sipUdpTransport');
const TestRtp = require('./testRtp');
const TestSipRequest = require('./testSipRequest');
const TestTls = require('./TestTls');

const enableTls = true;

class DetectSipAlg {
    constructor(srcIp, dstIp, testId, natSessionTimeout) {
        this.srcIp = srcIp;
        this.dstIp = dstIp;
        this.testId = testId;

        this.onUdpReceive = this.onUdpReceive.bind(this);
        this.onSipReceive = this.onSipReceive.bind(this);

        this.testRtp = null;
        this.testSipRequest = null;

        this.sipUdpTransports = {};
        this.sipUdpTransports["5060"] = new SipUdpTransport(this.srcIp, 5060, this.onSipReceive);
        this.sipUdpTransports["6060"] = new SipUdpTransport(this.srcIp, 6060, this.onSipReceive);
        this.sipUdpTransports["5678"] = new SipUdpTransport(this.srcIp, 5678, this.onSipReceive);

        this.rtpUdpTransports = {};
        this.rtpUdpTransports["30000"] = new UdpTransport(this.srcIp, 30000, this.onUdpReceive);
        this.rtpUdpTransports["30001"] = new UdpTransport(this.srcIp, 30001, this.onUdpReceive);
        this.rtpUdpTransports["30002"] = new UdpTransport(this.srcIp, 30002, this.onUdpReceive);
        this.rtpUdpTransports["50000"] = new UdpTransport(this.srcIp, 50000, this.onUdpReceive);

        this.testCounter = 0;
        this.tests = [];

        if (natSessionTimeout > 0) {
            const timeouts = [5, 10, 20, 30];
            for (let i=1; i<=natSessionTimeout; i++) {
                timeouts.push(60*i);
            }
            timeouts.forEach(delay => {
                this.tests.push({
                    type: "nat",
                    method: "invite",
                    srcPort: 6060,
                    dstPort: 6060,
                    delay
                })
            });
        } else {
            ["register", "invite", "keepalive"].forEach(method => {
                [5060, 6060].forEach(srcPort => {
                    [5060, 6060].forEach(dstPort => {
                        this.tests.push({
                            type: "sip",
                            method,
                            srcPort,
                            dstPort
                        })
                    });
                });
            });

            this.tests.push({
                type: "sip",
                method: "VOIPTEST",
                srcPort: 5678,
                dstPort: 6050
            });

            this.tests.push({
                type: "rtp",
                method: "VOIPTEST",
                srcPort: 50000,
                dstPort: 30000
            });

            [30000, 30001, 30002].forEach(port => {
                this.tests.push({
                    type: "rtp",
                    srcPort: port,
                    dstPort: port
                })
            });

            if (enableTls) {
                [5061, 6061].forEach(port => {
                    this.tests.push({
                        type: "tls",
                        dstPort: port
                    })
                });
            }
        }
    }

    // Used only for debugging - to simulate NAT.
    setSrcIp(srcIp) {
        this.srcIp = srcIp;
    }

    init(callback) {
        let waitForSockets = Object.keys(this.sipUdpTransports).length + Object.keys(this.rtpUdpTransports).length;

        console.log("Starting init - waitForSockets", waitForSockets);

        const localCallback = (result) => {
            waitForSockets--;

            console.log("waitForSockets", waitForSockets, "result", result);

            if (result === "Pass") {
                if (waitForSockets === 0) {
                    callback("Pass");
                }
            } else {
                waitForSockets = -1;
                callback(result);
            }
        };

        Object.keys(this.sipUdpTransports).forEach(port => {
            console.log("DetectSipAlg: starting SIP UDP port", port);

            if (!this.sipUdpTransports[port].start(localCallback)) {
                this.stop();
                return "Failed to open SIP UDP port " + port;
            }
        });

        Object.keys(this.rtpUdpTransports).forEach(port => {
            console.log("DetectSipAlg: starting RTP UDP port", port);

            if (!this.rtpUdpTransports[port].start(localCallback)) {
                this.stop();
                return "Failed to open RTP UDP port " + port;
            }
        });

        return "Pass"
    }

    nextTest(callback) {
        if (this.testCounter >= this.tests.length) {
            callback({result: "Done"});
            return;
        }

        const test = this.tests[this.testCounter++];

        //console.log(JSON.stringify(test));

        if (test.type === "sip") {
            this.testSipRequest = new TestSipRequest(this.sipUdpTransports[test.srcPort], this.srcIp, test.srcPort, this.dstIp, test.dstPort, this.testId);
            this.testSipRequest.test(test.method, (result, rtd, publicAddress) => {
                if (this.testSipRequest) {
                    callback({
                        type: 'SIP', protocol: 'UDP', method: test.method.toUpperCase(),
                        srcPort: test.srcPort, dstPort: test.dstPort, result, rtd, publicAddress
                    });
                }
            });
        } else if (test.type === "rtp") {
            this.testRtp = new TestRtp(this.rtpUdpTransports[test.srcPort], this.dstIp, test.dstPort);
            this.testRtp.test((result, rtd) => {
                if (this.testRtp) {
                    callback({type: 'RTP', protocol: 'UDP', srcPort: test.srcPort, dstPort: test.dstPort, result, rtd});
                }
            });
        } else if (test.type === "tls") {
            this.testTls = new TestTls(this.dstIp, test.dstPort);
            this.testTls.test((result, rtd) => {
                if (this.testTls) {
                    callback({type: 'SIP', protocol: 'TLS', srcPort: 0, dstPort: test.dstPort, result, rtd});
                }
            });
        } else if (test.type === "nat") {
                this.testSipRequest = new TestSipRequest(this.sipUdpTransports[test.srcPort], this.srcIp, test.srcPort,
                    this.dstIp, test.dstPort, this.testId);
                this.testSipRequest.testNat(test.method, test.delay, (result, rtd, publicAddress) => {
                    if (this.testSipRequest) {
                        callback({
                            type: 'NAT', protocol: 'UDP', method: test.delay + " Sec",
                            srcPort: test.srcPort, dstPort: test.dstPort, result, rtd, publicAddress
                        });
                    }
                });
        } else {
            callback({result: "Done"});
        }
    }

    stop() {
        console.log("DetectSipAlg: stop()");
        this.testRtp = null;
        this.testSipRequest = null;
        this.testTls = null;

        Object.keys(this.sipUdpTransports).forEach(port => {
            this.sipUdpTransports[port].stop();
        });

        Object.keys(this.rtpUdpTransports).forEach(port => {
            this.rtpUdpTransports[port].stop();
        });
    }

    onUdpReceive(msg, ip, port, transport) {
        if (this.testRtp) {
            this.testRtp.onReceive(msg, ip, port, transport);
        }
    }

    onSipReceive(msg, ip, port, transport) {
        if (this.testSipRequest) {
            this.testSipRequest.onReceive(msg, ip, port, transport);
        }
    }
}

module.exports = DetectSipAlg;