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

export type NodeProcess = Deno.Process<
  { cmd: []; stdin: "piped"; stdout: "piped" }
>;

export function process(method: string) {
  const cmd = `node node/build/${method}.js`.split(" ");
  const process = Deno.run({ cmd, stdin: "piped", stdout: "piped" });
  return process;
}

export async function call(process: NodeProcess, request = {}) {
  const { stringify, parse } = JSON;

  const reader = process.stdout!!;
  const writer = process.stdin!!;

  await writer.write(encode(stringify(request) + "\n"));

  for await (const line of readLines(reader)) {
    return parse(line);
  }

  throw new Error("No result");
}

export async function genKeyPair() {
  return await call(process("generate")) as KeyPair;
}

export async function diffieHellman(dh: DiffieHellman) {
  return await call(process("diffiehellman"), dh);
}

export async function genSalt() {
  return await call(process("salt")) as string;
}

export async function sign(keyPair: KeyPair, data: Uint8Array) {
  return await call(process("sign"), {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    data: Array.from(data),
  });
}

export async function decrypt(
  decryptor: NodeProcess,
  data: Uint8Array,
  secret: string,
) {
  const response = await call(decryptor, {
    data: Array.from(data),
    secret,
  });

  return new Uint8Array(response);
}

export async function encrypt(
  encryptor: NodeProcess,
  data: Uint8Array,
  secret: string,
) {
  const response = await call(encryptor, {
    data: Array.from(data),
    secret,
  });

  return new Uint8Array(response);
}
