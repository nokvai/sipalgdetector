// sipAlgDetector.js

import React from 'react';
import sprintf from 'sprintf';
import SelectIp from './selectIp';
const {ipcRenderer} = requireElectron('electron');

const NiceResult = ({result}) => {
    if (result.startsWith("Pass")) {
        return (<em style={{background: "green", color: "white", paddingLeft: 3, paddingRight: 5}}>{result}</em>)
    } else if (result.startsWith("Failed")) {
        return (<em style={{background: "red", color: "white", paddingLeft: 3, paddingRight: 5}}>{result}</em>)
    } else if (result.startsWith("Timeout")) {
        return (<em style={{background: "orange", color: "white", paddingLeft: 3, paddingRight: 5}}>{result}</em>)
    } else {
        return result;
    }
};

class SipAlgDetector extends React.Component {
    constructor(props) {
        super(props);

        this.startTest = this.startTest.bind(this);
        this.startNatSessionTimeoutTest = this.startNatSessionTimeoutTest.bind(this);
        this.stopTest = this.stopTest.bind(this);
        this.clearResults = this.clearResults.bind(this);
        this.updateTestResults = this.updateTestResults.bind(this);
        this.copyResults = this.copyResults.bind(this);
        this.emailResults = this.emailResults.bind(this);
        this.updateSelectedIp = this.updateSelectedIp.bind(this);
        this.updateTime = this.updateTime.bind(this);
        this.onTimeoutChange = this.onTimeoutChange.bind(this);

        this.state = {
            firstTest: true,
            resultHeader: "",
            resultFooter: "",
            resultLines: [],
            counter: 1,
            startTime: Date.now(),
            text: "",
            testing: false,
            ips: [],
            selectedIp: "0.0.0.0",
            testTime: "0:00",
            timeout: 2,
            maxDuration: 5
        };
    }

    componentDidMount() {
        ipcRenderer.send('getIPv4Addresses');

        ipcRenderer.on('getIPv4Addresses', (event, ips) => {
            console.log('getIPv4Addresses returned:', ips);

            this.state.ips = ips;
            if (ips.length > 0) {
                this.state.selectedIp = ips[0].value;
            }
            this.setState(this.state);
        });

        ipcRenderer.on('testId', (event, testId) => {
            let resultHeader = "Local IP Address: " + this.state.selectedIp + "             " + (new Date()).toString() + "\n";
            resultHeader +=    "Test ID:          " + testId + "\n\n";

            resultHeader += sprintf("%2s %-13s %-4s %-5s %-5s %-4s %-21s    %s\n", "# ", "Test Type", "Port", "From", "To", "Time", "Public Address", "Test Result");
            resultHeader += sprintf("%2s %-13s %-4s %-5s %-5s %-4s %-21s    %s\n", "--", "-------------", "----", "-----", "-----", "----", "---------------------", "-------------------------------------------");

            this.updateTime(true);
            this.setState({resultHeader: resultHeader, resultFooter: "", resultLines: [], counter: 1, startTime: Date.now(), text: "", testing: true, testTime: "0:00", testId});
        });

        ipcRenderer.on('testResults', (event, results) => {
            console.log("Receive test results", JSON.stringify(results, null, 2));
            this.updateTestResults(results);
        });
    }

    updateSelectedIp(selectedIp) {
        this.state.selectedIp = selectedIp;
        this.setState(this.state);
    }

    onTimeoutChange(event) {
        this.setState({timeout: event.target.value});
    }

    updateTime(start) {
        if (start) {
            setTimeout(this.updateTime, 1000);
        }
        else if (this.state.testing) {
            const seconds = Math.floor((Date.now() - this.state.startTime) / 1000);
            this.state.testTime = sprintf("%d:%02d", Math.floor(seconds/60), seconds % 60);
            setTimeout(this.updateTime, 1000);
            this.setState(this.state);
        }
    }

    startTest() {
        if (this.state.selectedIp === "0.0.0.0") {
            this.setState({resultHeader: "Please select a local IP address.", resultFooter: "", resultLines: [],
                counter: 1, startTime: Date.now(), text: "", testing: false});
        } else {
            ipcRenderer.send('startTest', this.state.selectedIp);
            this.setState({maxDuration: 2});
        }
    }

    startNatSessionTimeoutTest() {
        if (this.state.selectedIp === "0.0.0.0") {
            this.setState({resultHeader: "Please select a local IP address.", resultFooter: "", resultLines: [],
                counter: 1, startTime: Date.now(), text: "", testing: false});
        } else {
            ipcRenderer.send('startNatSessionTimeoutTest', {selectedIp: this.state.selectedIp, timeout: this.state.timeout});
            let maxDuration = 2 + Math.floor(parseInt(this.state.timeout)*(parseInt(this.state.timeout)+1)/2);
            this.setState({maxDuration});
        }
    }

    stopTest(abort=true) {
        if (this.state.testing) {
            ipcRenderer.send('stopTest');
            if (abort) {
                this.updateTestResults({result: "Aborted"});
            }
        }
    }

    clearResults() {
        this.stopTest(false);
        this.setState({resultHeader: "", resultFooter: "", resultLines: [], counter: 1, startTime: Date.now(), text: "", testing: false});
    }

    updateTestResults(data) {
        const {type, protocol, method="", srcPort, dstPort, result, rtd, publicAddress=""} = data;

        //console.log("updateTestResults", JSON.stringify(data, null, 2));

        if (result.startsWith("Error")) {
            if (this.state.firstTest) {
                this.state.resultHeader += "\n";
            }

            this.state.resultHeader += result + "\n";
            this.state.resultLines = [];
            this.state.resultFooter = "\nCan't start the test";

            this.state.text = this.state.resultHeader;
            this.state.testing = false;
            this.state.firstTest = false;

        } else if (result !== "Done" && result !== "Aborted") {
            let line = sprintf("%-2d %-13s %-4s %5d %5d %4d %21s    ", this.state.counter++, type + " " + method, protocol, srcPort, dstPort, Math.floor(rtd/1000.0), publicAddress);
            this.state.resultLines.push({line, result});
        }

        if (result.startsWith("Done") || result.startsWith("Timeout") || (result === "Aborted")) {
            if (result === "Aborted") {
                this.state.resultFooter = sprintf("\nTest stopped by user, run time: %.3f Seconds\n", (Date.now() - this.state.startTime) / 1000.0);
            } else {
                this.state.resultFooter = sprintf("\nTest completed, run time: %.3f Seconds\n", (Date.now() - this.state.startTime) / 1000.0);
            }

            let text = "SIP ALG Detector\n\n";
            text += this.state.resultHeader;
            this.state.resultLines.forEach(line => {
                text += line.line + line.result + "\n";
            });
            text += this.state.resultFooter;

            this.stopTest(false);

            this.state.text = text;
            this.state.testing = false;
            this.state.firstTest = false;
        }

        this.setState(this.state);
    }

    copyResults() {
        document.oncopy = (event) => {
            event.clipboardData.setData('text/plain', this.state.text);
            event.preventDefault();
        };
        document.execCommand("Copy", false, null);
    }

    emailResults() {
        const subject = "SIP ALG Detector Test Results";
        const body = this.state.text;

        let uri = "mailto:?subject=" + encodeURIComponent(subject);
        uri += "&body=" + encodeURIComponent(body);

        console.log("open window... mailto with length:", uri.length);
        const win = window.open(uri, '_blank ');
        //setTimeout(() => win.close(), 1000);
    }

    render() {
        return (
            <div style={{marginRight: 10, marginLeft: 10, marginTop: 0}}>
                <div style={{marginBottom: 20}}>
                    <span style={{fontSize: 14, fontFamily: "Arial", color: "#3b67bf"}}>Local IP Address:</span>
                    {<SelectIp
                        listOfIps={this.state.ips}
                        selectedIp={this.state.selectedIp}
                        onSelect={this.updateSelectedIp}
                        disabled={this.state.testing}
                    />}

                    <button className="btn-green"
                            style={{marginLeft: 10}}
                            onClick={this.startTest}
                            disabled={this.state.testing}
                    >
                        Start Test
                    </button>

                    {this.state.testing ?
                        <button className="btn-orange" style={{marginLeft: 10}} onClick={this.stopTest}>
                            Stop Test
                        </button> : null
                    }

                    <select style={{marginLeft: 10, marginTop: 0, float: "right"}}
                            disabled={this.state.testing}
                            onChange={this.onTimeoutChange}
                            value={this.state.timeout}
                    >
                        {
                            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(timeout => (
                                <option key={timeout} value={timeout}>{timeout + " Minutes"}</option>
                            ))
                        }
                    </select>

                    <button className="btn-blue"
                            style={{float: "right"}}
                            onClick={this.startNatSessionTimeoutTest}
                            disabled={this.state.testing}>
                        Detect NAT timeout
                    </button>
                </div>

                {this.state.resultHeader.length > 0 ? <hr /> : null}

                <pre style={{fontSize: "14px", overflow: "auto"}}>
                    <code>
                        <strong>{this.state.resultHeader}</strong>
                        {this.state.resultLines.map((line, index) => (
                            <div key={index}>
                                {line.line}
                                <NiceResult result={line.result}/>
                            </div>
                        ))}
                        <strong>{this.state.resultFooter}</strong>
                    </code>
                </pre>

                {this.state.resultFooter.length > 0 ?
                    <div>
                        <hr style={{marginBottom: 10}}/>

                        <button className="btn-blue" onClick={this.copyResults}>
                            Copy to Clipboard
                        </button>

                        <button className="btn-blue" onClick={this.emailResults}>
                            Open Results in Email
                        </button>

                        <button className="btn-blue" style={{float: "right"}} onClick={this.clearResults}>
                            Clear
                        </button>
                    </div> : null}
                {this.state.testing ?
                    <div style={{fontFamily: "Arial"}}>
                        <hr />
                        <progress style={{height: "15px", width: "100%"}} value={this.state.counter} max="20" />
                        <span>Please wait, the test can take up to {this.state.maxDuration} Minutes - </span><strong>{this.state.testTime}</strong>
                    </div> : null}
            </div>
        )
    }
}

export default SipAlgDetector;
