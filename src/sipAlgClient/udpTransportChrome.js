// udpTransportChrome.js

"use strict";

const os = require('os');
const net = require('net');
const dgram = require('dgram');

class UdpTransport {
    constructor(ip, port, onReceive) {
        this.ip = ip;
        this.port = port;
        this.onReceive = onReceive;
        this.socketId = null;
    }

    getSourceIp() {
        return this.ip;
    }

    getSourcePort() {
        return this.port;
    }

    start(callback) {
        chrome.sockets.udp.create({}, (socketInfo) => {
            this.socketId = socketInfo.socketId;

            chrome.sockets.udp.onReceive.addListener((info) => {
                if (info.socketId !== this.socketId) {
                    return;
                }

                //console.log("received info =", JSON.stringify(info, null, 2));
                //console.log("info.data", info.data);

                if (this.onReceive) {
                    // https://developer.chrome.com/apps/sockets_udp#event-onReceive
                    // data: ArrayBuffer
                    this.onReceive(info.data, info.remoteAddress, info.remotePort, this);
                }
            });

            chrome.sockets.udp.bind(this.socketId, this.ip, this.port, (result) => {
                if (result < 0) {
                    console.log("Failed to bind UDP port", this.port);
                    callback("Error binding UDP port " + this.port);
                } else {
                    console.log("bind UDP port", this.port);
                    callback("Pass");
                }
            });
        });

        return true;
    };

    stop() {
        if (this.socketId) {
            chrome.sockets.udp.close(this.socketId);
            this.socketId = null;
        }
    };

    send(arrayBuffer, ip, port) {
        //console.log("send to ", ip, port);
        if (this.socketId) {
            chrome.sockets.udp.send(this.socketId, arrayBuffer, ip, port, (sendInfo) => {
                //console.log("UDP, sent " + sendInfo.bytesSent + " bytes to " + ip + ":" + port);
            });
        }
    }
}

function validIpv4(ip) {
    const fields = ip.split('.');
    if (fields.length !== 4) {
        return false;
    }

    let valid = true;
    fields.forEach(s => {
        let n = parseInt(s);
        if (n < 0 || n > 255) {
            valid = false;
        }
    });

    return valid;
}

const getIPv4Addresses = (callback) => {
    // Chrome app version
    chrome.system.network.getNetworkInterfaces((interfaces) => {
        console.log("Chrome found the following interfaces", interfaces);

        let ips = [];
        interfaces
            .filter((ip) => validIpv4(ip.address))
            .forEach((ip) => ips.push({value: ip.address, label: ip.address + "  ---  " + ip.name}));
        callback(ips);
    });
};

module.exports = {UdpTransport, getIPv4Addresses};



