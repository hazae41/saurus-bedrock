import { Minecraft } from "./minecraft.ts";
import { Player } from "./players.ts";
import { WSHandler, WSConnection } from "./websockets.ts";

import { HTTPSOptions } from "https://deno.land/std@0.65.0/http/server.ts";
import { Random } from "https://deno.land/x/random@v1.1.2/Random.js";

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
      await conn.write("Action?");
      const action = await conn.read();
      if (typeof action !== "string") return;

      if (action === "list") await this.list(conn);
      if (action === "connect") await this.connect(conn);
      if (action === "authorize") await this.authorize(conn);
    } catch (e) {
      if (conn.closed) throw e;
      await conn.write(e.message);
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

  private async connect(conn: WSConnection) {
    const etype = new Error("Type error");

    const { players } = this.minecraft;

    await conn.write("Player name?");
    const name = await conn.read();
    if (typeof name !== "string") throw etype;

    const player = players.names.get(name);

    if (!player) {
      throw new Error("Invalid name");
    }

    if (player.conn && !player.conn.closed) {
      throw new Error("Already connected");
    }

    const start = Date.now();
    const code = new Random().string(6);
    player.actionbar(`Code: ${code}`);

    while (true) {
      await conn.write("Code?");
      const code2 = await conn.read();
      if (typeof code2 !== "string") throw etype;

      if (code2 === code) break;
      await conn.write("Invalid code");

      const now = Date.now();
      const limit = 30 * 1000;

      if (now - start > limit) {
        throw new Error("Time expired");
      }
    }

    await conn.write("Connected");
    player.actionbar("Connected");
    player.conn = conn;
  }

  private async authorize(conn: WSConnection) {
    const etype = new Error("Type error");

    const { players } = this.minecraft;

    await conn.write("Player name?");

    const name = await conn.read();
    if (typeof name !== "string") throw etype;

    const player = players.names.get(name);

    if (!player) {
      throw new Error("Invalid name");
    }

    if (!player.conn) {
      throw new Error("Not connected");
    }

    await conn.write("Token?");
    const token = await conn.read();
    if (typeof token !== "string") throw etype;

    await player.conn.write(token);
    const token2 = await player.conn.read();
    if (typeof token2 !== "string") throw etype;

    if (token !== token2) {
      // await player.conn.close();
      throw new Error("Invalid token");
    }

    await conn.write("Authorized");
    const app = new App(player, conn);
    await this.authorized(app);
  }

  private async authorized(app: App) {
    const etype = new Error("Type error");

    const { player } = app;

    while (true) {
      await app.conn.write("Action?");
      const action = await app.conn.read();
      if (typeof action !== "string") throw etype;

      if (action === "getpos") {
        player.getpos();
      }

      if (action === "title") {
        app.conn.write("Title?");
        const title = await app.conn.read();
        if (typeof title !== "string") throw etype;

        app.conn.write("Subtitle?");
        const subtitle = await app.conn.read();
        if (typeof subtitle !== "string") throw etype;

        await player.title(title, subtitle);
      }

      if (action === "actionbar") {
        app.conn.write("Message?");
        const message = await app.conn.read();
        if (typeof message !== "string") throw etype;

        await player.actionbar(message);
      }
    }
  }
}

export class App {
  constructor(
    readonly player: Player,
    readonly conn: WSConnection,
  ) {}
}
