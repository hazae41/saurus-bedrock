import { encode, decode } from "./saurus.ts";

export interface DiffieHellman {
  privateKey: string;
  publicKey: string;
  salt: string;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export class Node {
  readonly process: Deno.Process<any>;

  constructor(readonly port: number) {
    const options: any = { stdin: "piped" };
    const cmd = `node node/node.js ${port}`.split(" ");
    this.process = Deno.run({ cmd, ...options });
  }

  async kill() {
    this.process.kill(9);
  }

  async call(method: number, data?: Uint8Array) {
    const { port } = this;
    const conn = await Deno.connect({ port });
    const concat = [method, ...Array.from(data ?? [])];
    await conn.write(new Uint8Array(concat));
    return await Deno.readAll(conn);
  }

  async zip(data: Uint8Array) {
    return await this.call(0, data);
  }

  async unzip(data: Uint8Array) {
    return await this.call(1, data);
  }

  async gen(): Promise<KeyPair> {
    const result = await this.call(2);
    return JSON.parse(decode(result));
  }

  async key(dh: DiffieHellman) {
    const request = encode(JSON.stringify(dh));
    return await this.call(3, request);
  }

  async decrypt(data: Uint8Array, key: Uint8Array) {
    const array = [data, key].map((it) => Array.from(it));
    const request = encode(JSON.stringify(array));
    return await this.call(4, request);
  }

  async test(text: string) {
    const zipped = await node.zip(encode(text));
    const unzipped = decode(await node.unzip(zipped));
    return unzipped;
  }
}

export const node = new Node(8005);
