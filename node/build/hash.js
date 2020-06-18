"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var crypto_1 = require("crypto");
var std = readline_1.createInterface(process.stdin);
var b64 = function (text) { return Buffer.from(text, "base64"); };
std.on("line", function (input) {
    var stringify = JSON.stringify, parse = JSON.parse;
    var request = parse(input);
    var hash = crypto_1.createHash("sha256")
        .update(Buffer.from(request.counter))
        .update(Buffer.from(request.data))
        .update(b64(request.secret))
        .digest();
    var response = Array.from(hash);
    console.log(stringify(response));
    process.exit(0);
});
