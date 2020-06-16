import { encode, decode } from "./saurus.ts";
import {
  readLines,
} from "https://deno.land/std/io/bufio.ts";

export interface DiffieHellman {
  privateKey: string;
  publicKey: string;
  salt: string;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export async function call(method: string, data = new Uint8Array()) {
  const { stringify, parse } = JSON;
  const cmd = `node node/build/${method}.js`.split(" ");
  const process = Deno.run({ cmd, stdin: "piped", stdout: "piped" });
  const reader = process.stdout!!;
  const writer = process.stdin!!;
  const request = stringify(Array.from(data));
  await writer.write(encode(request + "\n"));

  for await (const line of readLines(reader)) {
    return new Uint8Array(parse(line));
  }

  throw new Error("No result");
}

export async function deflate(data: Uint8Array) {
  return await call("deflate", data);
}

export async function inflate(data: Uint8Array) {
  return await call("inflate", data);
}

export async function genKeyPair() {
  return await call("generate");
}

export async function test(text: string) {
  const zipped = await deflate(encode(text));
  const unzipped = decode(await inflate(zipped));
  return unzipped;
}
