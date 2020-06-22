import { encode, Saurus } from "./saurus.ts";
import { EventEmitter, Logger } from "./mod.ts";
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

  constructor(saurus: Saurus, command: string) {
    super();

    this.process = Deno.run({
      cmd: command.split(" "),
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    saurus.on(["command", "low"], this.write.bind(this));

    this.on(["log", "low"], this.onlog.bind(this));
    this.on(["command", "low"], this.oncommand.bind(this));
    this.on(["stopped", "low"], () => Deno.exit());

    this.read();
    this.error();
    this.sigint();
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
    if (line === "stop") {
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
    await this.write("stop");
  }

  async read() {
    const reader = this.process.stdout!!;
    this.on(["log", "low"], (line: string) => Logger.log(line));
    for await (const line of readLines(reader)) this.emit("log", line);
    this.emit("stopped");
  }

  async error() {
    const reader = this.process.stderr!!;
    this.on(["error", "low"], (line: string) => Logger.error(line));
    for await (const line of readLines(reader)) this.emit("error", line);
  }

  async write(line: string, newline = true) {
    const result = await this.emit("command", line);
    if (result === "cancelled") return;
    [line] = result;

    if (newline) line += "\n";
    const writer = this.process.stdin!!;
    await writer.write(encode(line));
  }
}
