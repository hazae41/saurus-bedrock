import { createInterface } from "readline";
import { createCipheriv } from "crypto";

const std = createInterface(process.stdin);

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = parse(input);

  const data = Buffer.from(request.data);
  const secret = Buffer.from(request.secret, "base64");
  const iv = secret.slice(0, 16);

  const cipher = createCipheriv("aes-256-cfb8", secret, iv);
  const result = cipher.update(data);

  console.log(stringify(Array.from(result)));
  process.exit(0);
});
