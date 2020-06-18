"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var std = readline_1.createInterface(process.stdin);
var b64 = function (text) { return Buffer.from(text, "base64"); };
var privateKeyFormat = {
    format: "der",
    type: "sec1"
};
var publicKeyFormat = {
    format: "der",
    type: "spki"
};
std.on("line", function (input) {
    var stringify = JSON.stringify, parse = JSON.parse;
    var request = parse(input);
    var publicKey = crypto_1.createPublicKey(__assign({ key: b64(request.publicKey) }, publicKeyFormat));
    var privateKey = crypto_1.createPrivateKey(__assign({ key: b64(request.privateKey) }, privateKeyFormat));
    var secret = crypto_1.diffieHellman({
        publicKey: publicKey,
        privateKey: privateKey
    });
    var key = crypto_1.createHash("sha256")
        .update(b64(request.salt))
        .update(secret)
        .digest();
    var response = key.toString("base64");
    console.log(stringify(response));
    process.exit(0);
});
