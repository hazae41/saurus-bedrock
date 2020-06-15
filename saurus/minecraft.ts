import { encode } from "./saurus.ts";
import { EventEmitter } from "./mod.ts";
import { readLines } from "https://deno.land/std/io/bufio.ts";

export type MinecraftEvent =
  | "log"
  | "error"
  | "command"
  | "start"
  | "started"
  | "stop"
  | "stopped";

export class Minecraft extends EventEmitter<MinecraftEvent> {
  readonly process: Deno.Process<any>;

  constructor(readonly cmd: string[]) {
    super();

    const options: any = { stdin: "piped", stdout: "piped", stderr: "piped" };
    this.process = Deno.run({ cmd, ...options });
    this.on(["log"], this.onlog.bind(this));
    this.on(["command"], this.oncommand.bind(this));
  }

  private async onlog(line: string) {
    if (line.includes("Starting Server")) {
      await this.emit("start");
    }

    if (line.includes("Server started.")) {
      await this.emit("started");
    }
  }

  private async oncommand(line: string) {
    if (line === "stop\n") {
      await this.emit("stop");
    }
  }

  async sigint() {
    try {
      await Deno.signals.interrupt();
      await this.stop();
    } catch (e) {}
  }

  async stop() {
    await this.write("stop\n");
  }

  async read(action?: (line: string) => void) {
    const reader = this.process.stdout;
    if (!reader) return;

    if (action) this.on(["log"], action);
    for await (const line of readLines(reader)) this.emit("log", line);
    this.emit("stopped");
  }

  async error(action?: (line: string) => void) {
    const reader = this.process.stderr!!;
    if (!reader) return;

    if (action) this.on(["error"], action);
    for await (const line of readLines(reader)) this.emit("error", line);
  }

  async write(line: string, newline = true) {
    if (newline) line += "\n";
    const writer = this.process.stdin!!;

    const result = await this.emit("command", line);
    if (result === "cancelled") return;
    [line] = result;

    await writer.write(encode(line));
  }
}
