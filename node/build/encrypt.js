"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var std = readline_1.createInterface(process.stdin);
var cipher;
std.on("line", function (input) {
    var stringify = JSON.stringify, parse = JSON.parse;
    var request = parse(input);
    var data = Buffer.from(request.data);
    var secret = Buffer.from(request.secret, "base64");
    var iv = secret.slice(0, 16);
    if (!cipher)
        cipher = crypto_1.createCipheriv("aes-256-cfb8", secret, iv);
    var result = cipher.update(data);
    console.log(stringify(Array.from(result)));
});
