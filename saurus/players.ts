import { encode, decode } from "./mod.ts";
import { Minecraft } from "./minecraft.ts";
import { WSConnection } from "./websockets.ts";
import * as Files from "./files.ts";

import { EventEmitter } from "https://deno.land/x/mutevents@2.2/mod.ts";
import * as YAML from "https://deno.land/std@0.65.0/encoding/yaml.ts";

export interface OfflinePlayers {
  [x: number]: string;
}

export class Players extends EventEmitter<"join" | "spawn" | "leave"> {
  readonly names = new Map<string, Player>();
  readonly xuids = new Map<number, Player>();

  readonly file = Deno.openSync("players.yml", Files.Normal);
  offlines: OfflinePlayers = {};

  constructor(
    readonly minecraft: Minecraft,
  ) {
    super();

    this.read();

    minecraft.on(["log"], this.onlog.bind(this));
  }

  nameOf(...xuids: number[]) {
    return xuids.map((xuid) => this.offlines[xuid]);
  }

  private async read() {
    const text = await Deno.readTextFile("./players.yml");
    this.offlines = (YAML.parse(text) || {}) as OfflinePlayers;
  }

  private async write() {
    const text = YAML.stringify(this.offlines);
    await Deno.writeTextFile("./players.yml", text);
  }

  private async onlog(line: string) {
    if (line.includes("Player connected")) {
      const split = line.trim().split(" ");
      const name = split[5].slice(0, -1);
      const xuid = Number(split[7]);

      const player = new Player(this.minecraft, name, xuid);

      this.names.set(name, player);
      this.xuids.set(xuid, player);

      this.offlines[xuid] = name;
      this.write();

      player.on(["spawn"], () => this.emit("spawn", player));

      await this.emit("join", player);
    }

    if (line.includes("Player disconnected")) {
      const split = line.trim().split(" ");
      const name = split[5].slice(0, -1);
      const xuid = Number(split[7]);

      const player = this.names.get(name)!!;

      this.names.delete(name);
      this.xuids.delete(xuid);

      await player.emit("leave");
      await this.emit("leave", player);
    }
  }
}

export class Player extends EventEmitter<"spawn" | "connect" | "leave"> {
  online = true;
  spawned = false;
  conn?: WSConnection;

  constructor(
    readonly minecraft: Minecraft,
    readonly name: string,
    readonly xuid: number,
  ) {
    super();

    this.on(["spawn"], () => {
      this.spawned = true;
    });

    this.on(["leave"], () => {
      this.spawned = false;
      this.online = false;
    });

    this.waitFor();
  }

  json() {
    const { name, xuid, spawned, online } = this;
    const connected = Boolean(this.conn);
    return { name, xuid, spawned, online, connected };
  }

  private async waitFor() {
    const { minecraft } = this;

    while (true) {
      if (!this.online) return;

      await new Promise(r => setTimeout(r, 1000));
      await minecraft.write(`testfor ${this.name}`);

      const [line] = await minecraft.wait(["log"])
      if (line.includes(`Found ${this.name}`)) break;
    }

    this.emit("spawn")
  }

  async tell(line: string) {
    const { minecraft } = this;
    await minecraft.write(`tell ${this.name} ${line}`);
  }

  async title(title = "", subtitle = "") {
    const { minecraft } = this;
    await minecraft.write(`title ${this.name} title ${title}`);
    await minecraft.write(`title ${this.name} subtitle ${subtitle}`);
  }

  async actionbar(message: string) {
    const { minecraft } = this;
    await minecraft.write(`title ${this.name} actionbar ${message}`);
  }

  async kick(reason = "") {
    const { minecraft } = this;
    await minecraft.write(`kick ${this.name} ${reason}`);
  }

  async execute(command: string) {
    const { minecraft } = this;
    await minecraft.write(`execute ${this.name} ~ ~ ~ ${command}`);
  }

  async getpos() {
    const { minecraft } = this;
    await this.execute(`teleport ~0 ~0 ~0`);
  }
}
