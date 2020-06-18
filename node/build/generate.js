"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var std = readline_1.createInterface(process.stdin);
var privateKeyFormat = {
    format: "der",
    type: "sec1"
};
var publicKeyFormat = {
    format: "der",
    type: "spki"
};
std.on("line", function (input) {
    var stringify = JSON.stringify;
    var keyPair = crypto_1.generateKeyPairSync("ec", { namedCurve: "secp384r1" });
    var privateKey = keyPair.privateKey["export"](privateKeyFormat);
    var publicKey = keyPair.publicKey["export"](publicKeyFormat);
    var response = {
        publicKey: publicKey.toString("base64"),
        privateKey: privateKey.toString("base64")
    };
    console.log(stringify(response));
    process.exit(0);
});
