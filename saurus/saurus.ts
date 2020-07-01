import { BufReader, readLines } from "https://deno.land/std/io/bufio.ts";
import * as Base64 from "https://deno.land/std/encoding/base64.ts";
import * as Base64url from "https://deno.land/std/encoding/base64url.ts";
import { Handler } from "./handler.ts";
import { EventEmitter, Logger } from "./mod.ts";

export const encode = (text: string) => new TextEncoder().encode(text);
export const decode = (buffer: Uint8Array) => new TextDecoder().decode(buffer);

export const fromB64 = (b64: string) => new Uint8Array(Base64.decode(b64));
export const toB64 = (buffer: Uint8Array) => Base64.encode(buffer);

export const fromB64url = (b64: string) =>
  new Uint8Array(Base64url.decode(b64));
export const toB64url = (buffer: Uint8Array) => Base64url.encode(buffer);

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
    console.error(e.message);
  }

  async read() {
    for await (const line of readLines(Deno.stdin)) {
      try {
        Logger.file.write(encode("> " + line));
        await this.emit("command", line);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
