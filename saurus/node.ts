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
  const cmd = `node node/${method}.js`.split(" ");
  const process = Deno.run({ cmd, stdin: "piped", stdout: "piped" });
  const reader = process.stdout!!;
  const writer = process.stdin!!;
  const request = stringify(Array.from(data));
  await writer.write(encode(request + "\n"));

  for await (const line of readLines(reader)) {
    process.kill(9);
    return new Uint8Array(parse(line));
  }

  process.kill(9);
  throw new Error("No result");
}

export async function zip(data: Uint8Array) {
  return await call("deflate", data);
}

export async function unzip(data: Uint8Array) {
  return await call("inflate", data);
}

export async function test(text: string) {
  const zipped = await zip(encode(text));
  const unzipped = decode(await unzip(zipped));
  return unzipped;
}

// export class Node {
//   // async gen(): Promise<KeyPair> {
//   //   const result = await this.call(2);
//   //   return JSON.parse(decode(result));
//   // }

//   // async key(dh: DiffieHellman) {
//   //   const request = encode(JSON.stringify(dh));
//   //   return await this.call(3, request);
//   // }

//   // async decrypt(data: Uint8Array, key: Uint8Array) {
//   //   const array = [data, key].map((it) => Array.from(it));
//   //   const request = encode(JSON.stringify(array));
//   //   return await this.call(4, request);
//   // }

// }
