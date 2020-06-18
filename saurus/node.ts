import { encode, decode } from "./saurus.ts";
import {
  readLines,
} from "https://deno.land/std/io/bufio.ts";
import { Buffer } from "./protocol/mod.ts";

export interface DiffieHellman {
  privateKey: string;
  publicKey: string;
  salt: string;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export async function call(method: string, request = {}) {
  const { stringify, parse } = JSON;

  const cmd = `node node/build/${method}.js`.split(" ");
  const process = Deno.run({ cmd, stdin: "piped", stdout: "piped" });

  const reader = process.stdout!!;
  const writer = process.stdin!!;

  await writer.write(encode(stringify(request) + "\n"));

  for await (const line of readLines(reader)) {
    return parse(line);
  }

  throw new Error("No result");
}

export async function deflate(data: Uint8Array) {
  const request = Array.from(data);
  const response = await call("deflate", request);
  return new Uint8Array(response);
}

export async function inflate(data: Uint8Array) {
  const request = Array.from(data);
  const response = await call("inflate", request);
  return new Uint8Array(response);
}

export async function genKeyPair() {
  return await call("generate") as KeyPair;
}

export async function diffieHellman(dh: DiffieHellman) {
  return await call("diffiehellman", dh);
}

export async function genSalt() {
  return await call("salt") as string;
}

export async function sign(keyPair: KeyPair, data: Uint8Array) {
  return await call("sign", {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    data: Array.from(data),
  });
}

export async function decrypt(data: Uint8Array, secret: string) {
  const response = await call("decrypt", {
    data: Array.from(data),
    secret,
  });

  return new Uint8Array(response);
}

export async function encrypt(data: Uint8Array, secret: string) {
  const response = await call("encrypt", {
    data: Array.from(data),
    secret,
  });

  return new Uint8Array(response);
}

export async function hashOf(
  data: Uint8Array,
  counter: number,
  secret: string,
) {
  const bcounter = Buffer.empty(8);
  bcounter.writeLLong(counter);

  const response = await call("hash", {
    data: Array.from(data),
    counter: Array.from(bcounter.export()),
    secret,
  });

  return new Uint8Array(response);
}

export async function test(text: string) {
  const zipped = await deflate(encode(text));
  const unzipped = decode(await inflate(zipped));
  return unzipped;
}
