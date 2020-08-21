import { Minecraft } from "./minecraft.ts";
import { Player } from "./players.ts";
import { WSHandler, WSConnection } from "./websockets.ts";

import { HTTPSOptions } from "https://deno.land/std@0.65.0/http/server.ts";
import { Random } from "https://deno.land/x/random@v1.1.2/Random.js";
import { isObject, isString } from "./types.ts";

export class Connector {
  handler = new WSHandler(this.options);

  constructor(
    readonly minecraft: Minecraft,
    readonly options: HTTPSOptions,
  ) {
    this.handler.on(["accept"], this.onaccept.bind(this));
  }

  private async onaccept(conn: WSConnection) {
    try {
      const etype = Error("Type error");

      const request = await conn.read();

      const action = request.action
      if (!isString(action)) throw etype;

      if (action === "list") await this.list(conn);
      if (action === "connect") await this.connect(conn, request);
      if (action === "authorize") await this.authorize(conn, request);
    } catch (e) {
      if (conn.closed) throw e;
      await conn.error(e.message);
      await conn.close();
    }
  }

  private async list(conn: WSConnection) {
    const { minecraft } = this;
    const { names } = minecraft.players;
    const players = Array.from(names.values());
    const list = players.map((it: Player) => it.json());
    await conn.write(list);
    await conn.close();
  }

  private async connect(conn: WSConnection, request: any) {
    const etype = Error("Type error");

    const { players } = this.minecraft;

    const name = request.name
    if (!isString(name)) throw etype;

    const player = players.names.get(name);
    if (!player) throw Error("Invalid name");

    if (player.conn && !player.conn.closed)
      throw Error("Already connected");

    const start = Date.now();
    const code = new Random().string(6);
    player.actionbar(`Code: ${code}`);
    await conn.write("Code?");

    for await (const code2 of conn.listen()) {
      if (typeof code2 !== "string") throw etype;

      if (code2 === code) break;
      await conn.write("Invalid code");

      const now = Date.now();
      const limit = 30 * 1000;

      if (now - start > limit)
        throw Error("Time expired");
    }

    player.conn = conn;
    await conn.write("Connected");

    player.actionbar("Connected");
    player.emit("connect");

    await this.connected(conn);
  }

  private async connected(conn: WSConnection) {
    for await (const msg of conn.listen())
      await conn.emit("message", msg)
  }

  private async authorize(conn: WSConnection, request: any) {
    const etype = new Error("Type error");

    const { players } = this.minecraft;

    const name = request.name
    if (!isString(name)) throw etype;

    const player = players.names.get(name);
    if (!player) throw new Error("Invalid name");
    if (!player.conn) throw new Error("Not connected");

    const token = request.token
    if (!isString(token)) throw etype;

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
    const etype = new Error("Type error");

    const { player } = app;

    for await (const request of app.conn.listen()) {
      const action = request.action
      if (!isString(action)) throw etype;

      if (action === "getpos") {
        player.getpos();
      }

      if (action === "title") {
        const title = request.title
        if (!isString(title)) throw etype;

        const subtitle = request.subtitle
        if (!isString(subtitle)) throw etype;

        await player.title(title, subtitle);
      }

      if (action === "actionbar") {
        const message = request.message
        if (!isString(message)) throw etype;

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
