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

const privateKeyFormat: any = {
  format: "der",
  type: "sec1",
};

const publicKeyFormat: any = {
  format: "der",
  type: "spki",
};

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = parse(input);

  const publicKey = createPublicKey({
    key: b64(request.publicKey),
    ...publicKeyFormat,
  });

  const privateKey = createPrivateKey({
    key: b64(request.privateKey),
    ...privateKeyFormat,
  });

  const secret = diffieHellman({
    publicKey,
    privateKey,
  });

  const key = createHash("sha256")
    .update(b64(request.salt))
    .update(secret)
    .digest();

  console.log(stringify(key));
  process.exit(0);
});
