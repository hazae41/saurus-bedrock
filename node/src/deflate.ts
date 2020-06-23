import { createInterface } from "readline";
import { deflateSync } from "zlib";

const std = createInterface(process.stdin);

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = Buffer.from(parse(input));
  const result = deflateSync(request);
  console.log(stringify(Array.from(result)));
});
