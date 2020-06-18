"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var std = readline_1.createInterface(process.stdin);
std.on("line", function (input) {
    var stringify = JSON.stringify, parse = JSON.parse;
    var request = parse(input);
    var data = Buffer.from(request.data);
    var secret = Buffer.from(request.secret, "base64");
    var iv = secret.slice(0, 16);
    var cipher = crypto_1.createDecipheriv("aes-256-gcm", secret, iv);
    var result = Buffer.concat([cipher.update(data), cipher.final()]);
    console.log(stringify(Array.from(result)));
    process.exit(0);
});
