import { encode, decode } from "./saurus.ts";

export class Node {
  readonly process: Deno.Process;

  constructor(readonly port: number) {
    const options: any = { stdin: "piped" };
    const cmd = `node saurus/node/node.mjs ${port}`.split(" ");
    this.process = Deno.run({ cmd, ...options });
  }

  async kill() {
    this.process.kill(9);
  }

  async zip(data: Uint8Array) {
    const { port } = this;
    const conn = await Deno.connect({ port });
    const concat = [0, ...Array.from(data)];
    await conn.write(new Uint8Array(concat));
    return await Deno.readAll(conn);
  }

  async unzip(data: Uint8Array) {
    const { port } = this;
    const conn = await Deno.connect({ port });
    const concat = [1, ...Array.from(data)];
    await conn.write(new Uint8Array(concat));
    return await Deno.readAll(conn);
  }

  async test(text: string) {
    const zipped = await node.zip(encode(text));
    const unzipped = decode(await node.unzip(zipped));
    return unzipped;
  }
}

export const node = new Node(8005);
