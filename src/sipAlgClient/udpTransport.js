// udpTransport.js

"use strict";

const os = require('os');
const net = require('net');
const dgram = require('dgram');

/*
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
*/

// Node.js version
class UdpTransport {
    constructor(ip, port, onReceive) {
        this.ip = ip;
        this.port = port;
        this.onReceive = onReceive;
        this.socket = null;
    }

    getSourceIp() {
        return this.ip;
    }

    getSourcePort() {
        return this.port;
    }

    start(callback) {
        this.socket = dgram.createSocket(net.isIPv6(this.ip) ? 'udp6' : 'udp4');
        if (this.socket === undefined) {
            return false;
        }

        this.socket.on('error', err => {
            if (this.socket) {
                this.socket.close();
                this.socket = null;
                console.log(`UDP error:\n${err.stack}`);
                console.log("Failed to bind UDP port", this.port);
                callback("Error binding UDP port " + this.port);
            }
        });

        this.socket.on('listening', () => {
            callback("Pass");
        });

        this.socket.on('message', (msg, rinfo) => {
            //console.log(msg.toString('ascii'));
            if (this.onReceive) {
                this.onReceive(msg, rinfo.address, rinfo.port, this);
            }
        });

        this.socket.bind(this.port, this.ip);

        return true;
    };

    stop() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    };

    send(msg, ip, port) {
        if (this.socket) {
            this.socket.send(msg, 0, msg.length, port, ip);
        }
    }
}

const getIPv4Addresses = () => {
    // node.js version
    const interfaces = os.networkInterfaces();

    let ips = [];
    Object.keys(interfaces)
        .forEach(key => {
            interfaces[key].forEach(ip => {
                if (ip.family === 'IPv4' && ip.address !== "127.0.0.1") {
                    ips.push({value: ip.address, label: ip.address + "  ---  " + key})
                }
            })
        });

    return ips;
};

module.exports = {UdpTransport, getIPv4Addresses};



