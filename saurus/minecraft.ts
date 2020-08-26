import { encode, decode } from "./mod.ts";
import { Players } from "./players.ts";

import { readLines } from "https://deno.land/std@0.65.0/io/bufio.ts";
import { EventEmitter } from "https://deno.land/x/mutevents@2.2/mod.ts";

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
  | "command"
  | "start"
  | "stop";

const Append: Deno.OpenOptions = {
  read: true,
  write: true,
  create: true,
  append: true,
};

export class Minecraft extends EventEmitter<MinecraftEvent> {
  readonly process: Deno.Process<any>;
  readonly players = new Players(this);
  readonly logs = Deno.openSync("logs.txt", Append);

  constructor(
    readonly cwd = "minecraft",
    readonly cmd = "./bedrock_server",
  ) {
    super();

    this.process = Deno.run({
      cwd: cwd,
      cmd: cmd.split(" "),
      env: { LD_LIBRARY_PATH: "." },
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    this.stdout();
    this.stderr();
    this.stdin();

    this.on(["log", "after"], this.onlog.bind(this));
    this.on(["error", "after"], this.onerror.bind(this));
    this.on(["command", "after"], this.oncommand.bind(this))
  }

  private async onlog(line: string) {
    this.log(line)
    console.log(line)

    if (line.includes("Server started.")) this.emit("start");
  }

  private async onerror(line: string) {
    this.log(line)
    console.error(line)
  }

  private async oncommand(line: string) {
    this.write(line);
  }

  private async stdout() {
    const reader = this.process.stdout!!;
    for await (const line of readLines(reader))
      this.emit("log", line);

    this.emit("stop");
    Deno.exit()
  }

  private async stderr() {
    const reader = this.process.stderr!!;
    for await (const line of readLines(reader))
      this.emit("error", line);
  }

  private async stdin() {
    const reader = Deno.stdin;
    for await (const line of readLines(reader)) {
      this.log(`> ${line}`)
      this.emit("command", line);
    }
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
