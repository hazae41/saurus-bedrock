import { createInterface } from "readline";
import { generateKeyPairSync } from "crypto";

const std = createInterface(process.stdin);

const privateKeyFormat: any = {
  format: "der",
  type: "sec1",
};

const publicKeyFormat: any = {
  format: "der",
  type: "spki",
};

std.on("line", (input) => {
  const { stringify } = JSON;
  const keyPair = generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  const privateKey = keyPair.privateKey.export(privateKeyFormat);
  const publicKey = keyPair.publicKey.export(publicKeyFormat);

  const response = {
    publicKey: (publicKey as Buffer).toString("base64"),
    privateKey: (privateKey as Buffer).toString("base64"),
  };

  console.log(stringify(response));
  process.exit(0);
});
