import { encode, decode } from "./mod.ts";
import { Players } from "./players.ts";
import { Append } from "./files.ts";

import { readLines } from "https://deno.land/std@0.65.0/io/bufio.ts";
import { EventEmitter } from "https://deno.land/x/mutevents@1.0/mod.ts";

export function timeOf(millis?: number) {
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

export type MinecraftEvent =
  | "log"
  | "error"
  | "command";

export class Minecraft extends EventEmitter<MinecraftEvent> {
  readonly process: Deno.Process<any>;
  readonly players = new Players(this);
  readonly logs = Deno.openSync("logs.txt", Append);

  constructor() {
    super();

    this.process = Deno.run({
      cwd: "minecraft",
      cmd: ["./bedrock_server"],
      env: { LD_LIBRARY_PATH: "." },
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    this.stdout();
    this.stderr();
    this.stdin();
  }

  private async stdout() {
    const reader = this.process.stdout!!;
    this.on(["log", "low"], (line: string) => console.log(line));
    this.on(["log", "low"], (line: string) => this.log(line));
    for await (const line of readLines(reader)) this.emit("log", line);
  }

  private async stderr() {
    const reader = this.process.stderr!!;
    this.on(["error", "low"], (line: string) => console.error(line));
    this.on(["error", "low"], (line: string) => this.log(line));
    for await (const line of readLines(reader)) this.emit("error", line);
  }

  private async stdin() {
    const reader = Deno.stdin;
    this.on(["command", "low"], (line: string) => this.write(line));
    this.on(["command"], (line: string) => this.log(`> ${line}`));
    for await (const line of readLines(reader)) this.emit("command", line);
  }

  async write(line: string) {
    line += "\n";
    const writer = this.process.stdin!!;
    await writer.write(encode(line));
  }

  async log(line: string) {
    line += "\n";
    await this.logs.write(encode(line));
  }

  async info(line: string) {
    this.log(`[${timeOf()} INFO] ${line}`);
    console.log(`[${timeOf()} INFO] ${line}`);
  }

  async warning(line: string) {
    this.log(`[${timeOf()} WARNING] ${line}`);
    console.log(`[${timeOf()} WARNING] ${line}`);
  }

  async execute(line: string) {
    await this.emit("command", line);
  }

  async stop() {
    await this.execute("stop");
  }
}
