import { Minecraft, App, isString } from "../start.ts";

import { Player, FS, YAML } from "../saurus/mod.ts";

export interface Config {
  [x: number]: boolean | undefined
}

export class PingTitle {
  config: Config = {};

  constructor(
    readonly minecraft: Minecraft
  ) {
    this.load()

    minecraft.players.on(["spawn"], this.onjoin.bind(this))
    minecraft.players.on(["authorize"], this.onapp.bind(this))
  }

  private async load() {
    if (!FS.existsSync("pings.yml")) Deno.createSync("pings.yml")
    const text = await Deno.readTextFile("pings.yml");
    this.config = (YAML.parse(text) || {}) as Config;
  }

  private async save() {
    const text = YAML.stringify(this.config);
    await Deno.writeTextFile("pings.yml", text);
  }

  isPingable(player: Player) {
    const value = this.config[player.xuid]
    if (value === undefined) return false;
    return value;
  }

  setPingable(player: Player, value: boolean) {
    this.config[player.xuid] = value
    this.save()
  }

  private async onjoin(player: Player) {
    player.on(["json"], (json: any) => {
      json.pingable = this.isPingable(player)
    })
  }

  private async onapp(app: App) {
    const { minecraft } = this;
    const { player } = app;

    app.on(["ping"], (params: any) => {
      const { name } = params;
      if (!isString(name)) return;

      const target = minecraft.players.names.get(name)
      if (!target) return;

      if (!this.isPingable(target)) return;

      target.title("Ping!", `from ${player.name}`, 20)
    })

    app.on(["has ping"], async () => {
      const value = this.isPingable(player)
      await app.conn.write(value)
    })

    app.on(["set ping"], (params: any) => {
      const { value } = params;
      this.setPingable(player, value);
    })
  }
}