import { createInterface } from "readline";
import {
  createPublicKey,
  createPrivateKey,
  // @ts-ignore
  diffieHellman,
  createHash,
} from "crypto";

const std = createInterface(process.stdin);

const b64 = (text: string) => Buffer.from(text, "base64");

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = parse(input);

  const hash = createHash("sha256")
    .update(Buffer.from(request.counter))
    .update(Buffer.from(request.data))
    .update(b64(request.secret))
    .digest();

  const response = Array.from(hash);
  console.log(stringify(response));
  process.exit(0);
});
