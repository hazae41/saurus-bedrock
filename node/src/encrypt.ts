import { createInterface } from "readline";
import { createCipheriv } from "crypto";

const std = createInterface(process.stdin);

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = parse(input);

  const data = Buffer.from(request.data);
  const key = Buffer.from(request.key);
  const iv = Buffer.from(request.iv);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const result = Buffer.concat([cipher.update(data), cipher.final()]);

  console.log(stringify(Array.from(result)));
  process.exit(0);
});
