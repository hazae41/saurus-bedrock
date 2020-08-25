import { Minecraft } from "./minecraft.ts";
import { Player } from "./players.ts";
import { WSHandler, WSConnection } from "./websockets.ts";

import { HTTPSOptions } from "https://deno.land/std@0.65.0/http/server.ts";
import { Random } from "https://deno.land/x/random@v1.1.2/Random.js";
import { isObject, isString } from "./types.ts";

export interface Code {
  code: string,
  time: number
}

export class Connector {
  readonly handler = new WSHandler(this.options);

  readonly players = new Map<Player, Code>()
  readonly codes = new Map<string, Player>()

  constructor(
    readonly minecraft: Minecraft,
    readonly options: HTTPSOptions,
  ) {
    this.handler.on(["accept"], this.onaccept.bind(this));

    this.minecraft.players.on(["spawn"], (player: Player) => {
      const i = setInterval(() => {
        if (!player.online) return clearInterval(i)
        if (player.conn) return clearInterval(i);

        const { code } = this.codeOf(player)
        player.actionbar(`Code: ${code}`)
      }, 2 * 1000)

      player.on(["leave"], () => {
        player.conn?.close("Disconnected");
        player.conn = undefined

        const code = this.players.get(player)
        if (code) this.codes.delete(code.code)
      })
    })
  }

  private makeCode(): Code {
    const time = Date.now();
    const code = new Random().string(5);
    return { code, time };
  }

  codeOf(player: Player) {
    let code = this.players.get(player);

    if (code) {
      const elapsed = Date.now() - code.time
      if (elapsed < 60 * 1000) return code;
    }

    code = this.makeCode()
    this.players.set(player, code);
    this.codes.set(code.code, player)
    return code;
  }

  private async onaccept(conn: WSConnection) {
    try {
      const request = await conn.read();

      const action = request.action
      if (!isString(action)) return;

      if (action === "list") await this.list(conn);
      if (action === "connect") await this.connect(conn, request);
      if (action === "authorize") await this.authorize(conn, request);
    } catch (e) {
      if (e instanceof Error)
        await conn.close(e.message);
      else console.error(e)
    }

    await conn.close()
  }

  private async list(conn: WSConnection) {
    const { minecraft } = this;
    const { names } = minecraft.players;
    const players = Array.from(names.values());
    const list = players.map((it: Player) => it.json());
    await conn.write(list);
  }

  private async connect(conn: WSConnection, request: any) {
    const _code = request.code
    if (!isString(_code)) return;
    const code = _code.toLowerCase()

    const player = this.codes.get(code);
    if (!player) throw Error("Invalid code")

    player.conn = conn;
    this.codes.delete(code)
    this.players.delete(player)
    await conn.write("Connected");

    player.actionbar("Connected");
    player.emit("connect");

    await this.connected(player);
  }

  private async connected(player: Player) {
    const conn = player.conn!!;
    for await (const msg of conn.listen())
      await conn.emit("message", msg)

    player.kick("Disconnected")
  }

  private async authorize(conn: WSConnection, request: any) {
    const { players } = this.minecraft;

    const name = request.name
    if (!isString(name)) return;

    const player = players.names.get(name);
    if (!player) throw new Error("Invalid name");
    if (!player.conn) throw new Error("Not connected");

    const token = request.token
    if (!isString(token)) return;

    const request2 = { action: "authorize", token }
    await player.conn.write(request2);

    while (true) {
      const [response] = await player.conn.wait(["message"]);
      if (response.action !== "authorize") continue;
      if (response.token === token) break;
    }

    await conn.write("Authorized");
    const app = new App(player, conn);
    await this.authorized(app);
  }

  private async authorized(app: App) {
    const { player } = app;

    for await (const request of app.conn.listen()) {
      const action = request.action
      if (!isString(action)) return;

      if (action === "getpos") {
        player.getpos();
      }

      if (action === "title") {
        const title = request.title
        if (!isString(title)) return;

        const subtitle = request.subtitle
        if (!isString(subtitle)) return;

        await player.title(title, subtitle);
      }

      if (action === "actionbar") {
        const message = request.message
        if (!isString(message)) return;

        await player.actionbar(message);
      }
    }
  }
}

export class App {
  constructor(
    readonly player: Player,
    readonly conn: WSConnection,
  ) { }
}
