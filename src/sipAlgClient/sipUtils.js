// SipUtils.js
// SIP utilities

const Utils = {};

Utils.getCurrenTime = function getCurrentTime() {
    // Time="2016-06-08 21:56:41.585"
    const d = new Date();

    return sprintf("%04d-%02d-%04d %02d:%02d:%02d.%03d",
        d.getYear()+1900, d.getMonth()+1, d.getDate(),
        d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
};

Utils.randomHexString = function(len) {
    const src = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let str = "";
    for (let i=0; i<len; i++) {
        str += src.charAt(Math.floor(Math.random() * src.length));
    }

    return str;
};

Utils.generateBranchValue = function() {
    return "z9hG4bK-" + Utils.randomHexString(8);
};

Utils.getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};

module.exports = Utils;
