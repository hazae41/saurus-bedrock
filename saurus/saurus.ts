import { BufReader } from "https://deno.land/std/io/bufio.ts";
import { Handler } from "./handler.ts";
import { EventEmitter, Logger } from "./mod.ts";

export const encode = (text: string) => new TextEncoder().encode(text);
export const decode = (buffer: Uint8Array) => new TextDecoder().decode(buffer);

export async function* read(reader: Deno.Reader) {
  const buffered = new BufReader(reader);

  while (true) {
    const line = await buffered.readString("\n");
    if (line !== null) yield line;
    else break;
  }
}

export interface SaurusOptions {
  handlers: Handler[];
}

export class Saurus extends EventEmitter<"command"> {
  readonly handlers: Handler[];

  constructor(options: SaurusOptions) {
    super();

    this.handlers = options.handlers;

    for (const handler of this.handlers) {
      handler.on(["error"], this.onerror.bind(this));
    }
  }

  private onerror(e: Error) {
    if (e.name === "ConnectionReset") return;
    console.error(e);
  }

  async read() {
    for await (const line of read(Deno.stdin)) {
      try {
        Logger.file.write(encode("> " + line));
        await this.emit("command", line);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
