// client.js

const DetectSipAlg = require('./detectSipAlg');
const Utils = require('./sipUtils');

class TestClient {
    constructor(selectedIp, natSessionTimeout, callback) {
        this.selectedIp = selectedIp;
        this.callback = callback;
        this.testResult = this.testResult.bind(this);
        this.testId = Utils.randomHexString(8);
        //this.detectSipAlg = new DetectSipAlg(selectedIp, "192.168.1.106", this.testId, natSessionTimeout);
        this.detectSipAlg = new DetectSipAlg(selectedIp, "64.28.122.110", this.testId, natSessionTimeout);
    }

    testResult(results) {
        const {type, protocol, method, srcPort, dstPort, result, rtd, publicAddress} = results;

        if (this.callback) {
            this.callback(results);
        }

        if (result.startsWith("Done") || result.startsWith("Timeout")) {
            console.log("Stopping test:", result);
        } else {
            console.log(type.toUpperCase(), protocol.toUpperCase(), method ? method.toUpperCase() : "", srcPort, dstPort, result, rtd, publicAddress);
            this.detectSipAlg.nextTest(this.testResult);
        }
    }

    start() {
        console.log("TestClient start()");

        this.detectSipAlg.init((result) => {
            if (result === "Pass") {
                console.log("Starting test...");
                this.detectSipAlg.nextTest(this.testResult);
            } else {
                console.log("Failed to initialize sockets", result);
                this.detectSipAlg.stop();
                if (this.callback) {
                    this.callback({result});
                }
            }
        });
    }

    stop() {
        this.detectSipAlg.stop();
    }
}

module.exports = TestClient;

