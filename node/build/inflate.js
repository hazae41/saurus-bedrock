"use strict";
exports.__esModule = true;
var readline_1 = require("readline");
var zlib_1 = require("zlib");
var std = readline_1.createInterface(process.stdin);
std.on("line", function (input) {
    var stringify = JSON.stringify, parse = JSON.parse;
    var request = Buffer.from(parse(input));
    var result = zlib_1.inflateSync(request);
    console.log(stringify(Array.from(result)));
    process.exit(0);
});
