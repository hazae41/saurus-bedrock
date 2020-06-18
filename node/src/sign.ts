import { createInterface } from "readline";
import { createPrivateKey } from "crypto";
import * as jwt from "jsonwebtoken";

const std = createInterface(process.stdin);

const b64 = (text: string) => Buffer.from(text, "base64");

std.on("line", (input) => {
  const { stringify, parse } = JSON;
  const request = parse(input);

  const data = Buffer.from(request.data);

  const privateKey = createPrivateKey({
    key: b64(request.privateKey),
    format: "der",
    type: "sec1",
  });

  const pem = privateKey.export({
    format: "pem",
    type: "sec1",
  });

  const header = {
    alg: "ES384",
    x5u: request.publicKey,
  };

  const token = jwt.sign(data, pem, { algorithm: "ES384", header });

  console.log(stringify(token));
  process.exit(0);
});
