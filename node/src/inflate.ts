import { createInterface } from "readline";
import { inflateRawSync } from "zlib";

const std = createInterface(process.stdin);

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = Buffer.from(parse(input));
  const result = inflateRawSync(request);
  console.log(stringify(Array.from(result)));
});
