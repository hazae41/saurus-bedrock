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
  console.log(stringify({ publicKey, privateKey }));
  process.exit(0);
});
