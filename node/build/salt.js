"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var std = readline_1.createInterface(process.stdin);
std.on("line", function () {
    var stringify = JSON.stringify;
    var salt = crypto_1.randomBytes(16);
    var response = salt.toString("base64");
    console.log(stringify(response));
    process.exit(0);
});
