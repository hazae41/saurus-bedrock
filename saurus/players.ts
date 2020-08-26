import { encode, decode, FS } from "./mod.ts";
import { Minecraft } from "./minecraft.ts";
import { WSConnection } from "./websockets.ts";

import { EventEmitter } from "https://deno.land/x/mutevents@2.2/mod.ts";
import * as YAML from "https://deno.land/std@0.65.0/encoding/yaml.ts";
import { App } from "./connector.ts";

export interface OfflinePlayers {
  [x: number]: string;
}

export class Players extends EventEmitter<"join" | "spawn" | "connect" | "authorize" | "leave"> {
  readonly names = new Map<string, Player>();
  readonly xuids = new Map<number, Player>();

  offlines: OfflinePlayers = {};

  constructor(
    readonly minecraft: Minecraft,
  ) {
    super();

    this.load();

    minecraft.on(["log"], this.onlog.bind(this));
  }

  async list() {
    const { names } = this;

    const promises = Array.from(names.values())
      .filter((it: Player) => it.spawned)
      .map((it: Player) => it.json());

    const list = await Promise.all(promises)

    return list
  }

  nameOf(...xuids: number[]) {
    return xuids.map((xuid) => this.offlines[xuid]);
  }

  private async load() {
    if (!FS.existsSync("players.yml")) Deno.createSync("players.yml")
    const text = await Deno.readTextFile("players.yml");
    this.offlines = (YAML.parse(text) || {}) as OfflinePlayers;
  }

  private async save() {
    const text = YAML.stringify(this.offlines);
    await Deno.writeTextFile("players.yml", text);
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
      this.save();

      player.on(["spawn"], () => this.emit("spawn", player));
      player.on(["connect"], () => this.emit("connect", player))
      player.on(["authorize"], (app: App) => this.emit("authorize", app))

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

export class Player extends EventEmitter<"spawn" | "connect" | "authorize" | "json" | "leave"> {
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

  async json() {
    const { name, xuid, connected } = this;
    let data = { name, xuid, connected };
    [data] = await this.emit("json", data)
    return data;
  }

  get connected() {
    return this.conn !== undefined;
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

  async title(
    title = "",
    subtitle = "",
    duration = 100
  ) {
    const { minecraft, name } = this;
    await minecraft.write(`title ${name} times 10 ${duration} 70`)
    await minecraft.write(`title ${name} title ${title}`);
    await minecraft.write(`title ${name} subtitle ${subtitle}`);
    await minecraft.write(`title ${name} reset`)
  }

  async actionbar(message: string) {
    const { minecraft, name } = this;
    await minecraft.write(`title ${name} actionbar ${message}`);
  }

  async kick(reason = "") {
    const { minecraft, name } = this;
    await minecraft.write(`kick ${name} ${reason}`);
  }

  async execute(command: string) {
    const { minecraft, name } = this;
    await minecraft.write(`execute ${name} ~ ~ ~ ${command}`);
  }

  async getpos() {
    await this.execute(`teleport ~0 ~0 ~0`);
  }
}
