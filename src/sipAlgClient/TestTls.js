// testTls.js

const https = require('https');

class TestTls {
    constructor(dstIp, dstPort) {
        this.dstIp = dstIp;
        this.dstPort = dstPort;
        this.startTime = 0;
        this.waitForResponse = false;
    }

    // Chrome app version
    /*test(callback) {
        this.startTime = Date.now();
        this.waitForResponse = true;

        try {
            const xhr = new XMLHttpRequest;
            xhr.open('get','https://' + this.dstIp + ':' + this.dstPort);
            xhr.onreadystatechange = () => {
                if(xhr.readyState === XMLHttpRequest.DONE) {
                    if (this.waitForResponse) {
                        this.waitForResponse = false;
                        if (xhr.status === 200) {
                            callback("Pass", Date.now() - this.startTime);
                        } else if (xhr.status !== 0) {
                            callback("Failed. Status = " + xhr.status, Date.now() - this.startTime);
                        }
                    }
                }
            };

            xhr.onerror = (e) => {
                if (this.waitForResponse) {
                    this.waitForResponse = false;
                    callback("Failed. Error = " + xhr.responseText, Date.now() - this.startTime);
                    console.log("XHR on error - ", e, "xhr.responseText", xhr.responseText);
                }
            };

        } catch (e) {
            console.log("XHR exception: ", e);
            if (this.waitForResponse) {
                this.waitForResponse = false;
                callback("Failed. Exception: " + e, Date.now() - this.startTime);
            }
        }

        setTimeout(() => {
            if (this.waitForResponse) {
                this.waitForResponse = false;
                callback("Failed. Connection timeout", Date.now() - this.startTime);
            }
        }, 2000);
    }*/

    // node.js version
    test(callback) {
        this.startTime = Date.now();
        this.waitForResponse = true;
        const options = {
            hostname: this.dstIp,
            port: this.dstPort,
            path: '/',
            method: 'GET',
            rejectUnauthorized: false,
            //requestCert: true
        };

        const req = https.request(options, (res) => {
            if (this.waitForResponse) {
                this.waitForResponse = false;

                if (parseInt(res.statusCode) === 200) {
                    callback("Pass", Date.now() - this.startTime);
                } else {
                    callback("Failed. TLS status: " + res.statusCode, Date.now() - this.startTime);
                }
            }
        });

        req.on('error', (e) => {
            if (this.waitForResponse) {
                this.waitForResponse = false;
                callback("Failed. " + e);
            }
        });

        req.end();

        setTimeout(() => {
            if (this.waitForResponse) {
                this.waitForResponse = false;
                callback("Failed. Connection timeout");
            }
        }, 2000);
    }
}

module.exports = TestTls;