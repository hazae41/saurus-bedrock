import { createInterface } from "readline";
import { inflateSync } from "zlib";

const std = createInterface(process.stdin, process.stdout);

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = Buffer.from(parse(input));
  const result = inflateSync(request);
  console.log(stringify(Array.from(result)));
});
