// testRtp.js

const enableChrome = false;

class TestRtp {
    constructor(transport, dstIp, dstPort, numberOfTries=3) {
        this.transport = transport;
        this.dstIp = dstIp;
        this.dstPort = dstPort;
        this.numberOfTries = numberOfTries;
        this.callback = null;
        this.waitForResponse = false;
        this.callId = null;
        this.startTime = 0;
    }

    generateRtp() {
        const rtp = new ArrayBuffer(12 + 20);
        rtp[0] = 0x80;              // version
        rtp[1] = 0x00;              // codec
        rtp[2] = 0x12;              // sequence number
        rtp[3] = 0x34;
        rtp[4] = 0x01;              // timestamp
        rtp[5] = 0x02;
        rtp[6] = 0x03;
        rtp[7] = 0x04;
        rtp[8] = 0x11;              // SSRC
        rtp[9] = 0x22;
        rtp[10] = 0x33;
        rtp[11] = 0x44;

        for (let i=0; i<20; i++) {
            rtp[12+i] = 0;
        }

        return rtp;
    }

    test(callback) {
        this.waitForResponse = true;
        this.startTime = Date.now();
        this.callback = callback;
        let msg = this.generateRtp().toString();
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
                    this.callback("Failed. No response", Date.now() - this.startTime);
                }
            }
        }, 1000*this.numberOfTries);
    }

    onReceive(msg, ip, port, transport) {
        if (!this.waitForResponse) {
            return;
        }

        this.waitForResponse = false;
        if (this.callback) {
            this.callback("Pass", Date.now() - this.startTime);
        }
    }
}

module.exports = TestRtp;