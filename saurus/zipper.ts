export class Zipper {
  readonly process: Deno.Process;

  constructor(readonly port: number) {
    const options: any = { stdin: "piped" };
    const cmd = `node saurus/zipper.mjs ${port}`.split(" ");
    this.process = Deno.run({ cmd, ...options });
  }

  async kill() {
    this.process.kill(9)
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
    const encoded = new TextEncoder().encode(text);
    const zipped = await zipper.zip(encoded);
    const unzipped = await zipper.unzip(zipped);
    const decoded = new TextDecoder().decode(unzipped);
    return decoded;
  }
}

export const zipper = new Zipper(8005);
