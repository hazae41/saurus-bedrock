import { BufReader } from "https://deno.land/std/io/bufio.ts";
import { EventEmitter } from "./events.ts";
import { Handler } from "./handler.ts";

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

export function time(millis?: number) {
  const twoDigits = (n: number) => `0${n}`.slice(-2);

  if (!millis) millis = Date.now();
  const date = new Date(millis);

  const year = date.getFullYear();
  const month = twoDigits(date.getMonth());
  const day = twoDigits(date.getDate());
  const hours = twoDigits(date.getHours());
  const minutes = twoDigits(date.getMinutes());
  const seconds = twoDigits(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function info(line: string) {
  log(`[${time()} INFO] ${line}`);
}

export function warning(line: string) {
  log(`[${time()} WARNING] ${line}`);
}

export function log(line: string, newline = true) {
  if (newline) line = line + "\n";
  Deno.stdout.write(encode(line));
}

export function error(line: string, newline = true) {
  if (newline) line = line + "\n";
  Deno.stderr.write(encode(line));
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
        await this.emit("command", line);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
