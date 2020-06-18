"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var jwt = require("jsonwebtoken");
var std = readline_1.createInterface(process.stdin);
var b64 = function (text) { return Buffer.from(text, "base64"); };
std.on("line", function (input) {
    var stringify = JSON.stringify, parse = JSON.parse;
    var request = parse(input);
    var data = Buffer.from(request.data);
    var privateKey = crypto_1.createPrivateKey({
        key: b64(request.privateKey),
        format: "der",
        type: "sec1"
    });
    var pem = privateKey["export"]({
        format: "pem",
        type: "sec1"
    });
    var header = {
        alg: "ES384",
        x5u: request.publicKey
    };
    var token = jwt.sign(data, pem, { algorithm: "ES384", header: header });
    console.log(stringify(token));
    process.exit(0);
});
