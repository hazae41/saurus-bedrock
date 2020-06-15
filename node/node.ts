import {
  createCipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  KeyPairKeyObjectResult,
  // @ts-ignore
  diffieHellman,
} from "crypto";
import { createServer } from "net";

const _mojang =
  "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE8ELkixyLcwlZryUQcu1TvPOmI2B7vX83ndnWRUaXm74wFfa5f/lwQNTfrLVHa2PmenpGI6JhIMUJaWZrjmMj90NoKNFSNBuKdm8rYiXsfaz3K36x/1U26HpG0ZxK/V1V";

const args = process.argv.slice(2);
const port = Number(args[0]);

const encode = (text: string) => new TextEncoder().encode(text);
const decode = (buffer: Buffer) => new TextDecoder().decode(buffer);

const b64 = (text: string) => Buffer.from(text, "base64");

const privateKeyFormat: { format: "der"; type: "sec1" } = {
  format: "der",
  type: "sec1",
};
const publicKeyFormat: { format: "der"; type: "spki" } = {
  format: "der",
  type: "spki",
};

const loadPublicKey = (key: Buffer) =>
  createPublicKey({ key, ...publicKeyFormat });
const loadPrivateKey = (key: Buffer) =>
  createPrivateKey({ key, ...privateKeyFormat });

const genECKeyPair = () =>
  generateKeyPairSync("ec", { namedCurve: "secp384r1" });

const exportKeyPair = (keyPair: KeyPairKeyObjectResult) => {
  const { privateKey, publicKey } = keyPair;
  const rawPrivateKey = privateKey.export(privateKeyFormat);
  const rawPublicKey = publicKey.export(publicKeyFormat);
  return { rawPublicKey, rawPrivateKey };
};

const gen = () => {
  const { rawPrivateKey, rawPublicKey } = exportKeyPair(genECKeyPair());

  const result = {
    privateKey: rawPrivateKey.toString("base64"),
    publicKey: rawPublicKey.toString("base64"),
  };

  return encode(JSON.stringify(result));
};

const key = (buffer: Buffer) => {
  const data = JSON.parse(decode(buffer));
  const { publicKey, privateKey, salt } = data;

  const secret = diffieHellman({
    privateKey: loadPrivateKey(b64(privateKey)),
    publicKey: loadPublicKey(b64(publicKey)),
  });

  const key = createHash("sha256")
    .update(b64(salt))
    .update(secret)
    .digest();

  return key;
};

const decrypt = (buffer: Buffer) => {
  const json = JSON.parse(decode(buffer)) as number[][];
  const data = Buffer.from(json[0]);
  const key = Buffer.from(json[1]);
  const iv = Buffer.from(json[1].slice(0, 16));
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
};

function handle(method: number, buffer: Buffer) {
  if (method === 2) return gen();
  if (method === 3) return key(buffer);
  if (method === 4) return decrypt(buffer);
}

createServer((socket) => {
  socket.on("data", (request) => {
    try {
      console.log(request.length);
      const method = request[0];
      const buffer = request.slice(1);
      const response = handle(method, buffer);
      socket.write(response);
      socket.destroy();
    } catch (e) {
      console.error(e);
      socket.destroy();
    }
  });
}).listen(port);
