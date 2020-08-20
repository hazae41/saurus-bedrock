import { encode, decode } from "./mod.ts";
import { Minecraft } from "./minecraft.ts";
import { WSConnection } from "./websockets.ts";
import * as Files from "./files.ts";

import { EventEmitter } from "https://deno.land/x/mutevents@1.0/mod.ts";
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
      console.log(this.offlines);
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

export class Player extends EventEmitter<"spawn" | "leave"> {
  spawned = false;

  connection?: WSConnection;

  constructor(
    readonly minecraft: Minecraft,
    readonly name: string,
    readonly xuid: number,
  ) {
    super();

    this.on(["spawn", "high"], () => {
      this.spawned = true;
    });

    this.on(["leave", "high"], () => {
      this.spawned = false;
    });

    this.wait();
  }

  private wait() {
    const check = () => this.minecraft.write(`testfor ${this.name}`);

    const onlog = (line: string) => {
      if (line.includes(`Found ${this.name}`)) {
        this.emit("spawn");
      }
    };

    this.minecraft.on(["log"], onlog);
    const i = setInterval(check, 1000);

    const clean = () => {
      this.minecraft.off(["log"], onlog);
      clearInterval(i);
    };

    this.on(["leave"], clean);
    this.on(["spawn"], () => {
      this.off(["leave"], clean);
      clean();
    });
  }

  async msg(line: string) {
    await this.minecraft.write(`tell ${this.name} ${line}`);
  }

  async title(title = "", subtitle = "") {
    await this.minecraft.write(`title ${this.name} title ${title}`);
    await this.minecraft.write(`title ${this.name} subtitle ${subtitle}`);
  }

  async actionbar(message: string) {
    await this.minecraft.write(`title ${this.name} actionbar ${message}`);
  }

  async kick(reason = "") {
    await this.minecraft.write(`kick ${this.name} ${reason}`);
  }
}
