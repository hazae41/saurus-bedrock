import { Minecraft } from "./minecraft.ts";
import { Players, Player } from "./players.ts";
import { WSHandler, WSConnection } from "./websockets.ts";

import { Random } from "https://deno.land/x/random@v1.1.2/Random.js";

export class Connector {
  handler = new WSHandler(this.port);

  constructor(
    readonly minecraft: Minecraft,
    readonly port: number,
    readonly tls = false,
  ) {
    this.handler.on(["accept"], this.onaccept.bind(this));
  }

  private async onaccept(conn: WSConnection) {
    conn.write("Action?");
    const action = await conn.read();
    if (typeof action !== "string") return;

    if (action === "list") this.list(conn);
    if (action === "connect") this.connect(conn);
    if (action === "authorize") this.authorize(conn);
  }

  private async list(conn: WSConnection) {
    const { minecraft } = this;
    const { names } = minecraft.players;
    const players = Array.from(names.values());
    const list = players.map((it: Player) => it.json());
    conn.write(list);
  }

  private async connect(conn: WSConnection) {
    const { players } = this.minecraft;
    conn.write("Player name?");

    const name = await conn.read();
    if (typeof name !== "string") return;

    const player = players.names.get(name);

    if (!player) {
      conn.write("Invalid name");
      return;
    }

    if (player.conn && !player.conn.closed) {
      conn.write("Already connected");
      return;
    }

    const start = Date.now();
    const code = new Random().string(6);
    player.actionbar(`Code: ${code}`);
    conn.write("Code?");

    while (true) {
      const code2 = await conn.read();
      if (typeof code2 !== "string") return;

      if (code2 === code) break;
      conn.write("Invalid code");

      const now = Date.now();
      const limit = 30 * 1000;
      if (now - start > limit) return;
    }

    conn.write("Connected");
    player.actionbar("Connected");
    player.conn = conn;
  }

  private async authorize(conn: WSConnection) {
    const { players } = this.minecraft;
    conn.write("Player name?");

    const name = await conn.read();
    if (typeof name !== "string") return;

    const player = players.names.get(name);

    if (!player) {
      conn.write("Invalid name");
      return;
    }

    if (!player.conn) {
      conn.write("Not connected");
      return;
    }

    conn.write("Token?");
    const token = await conn.read();
    if (typeof token !== "string") return;

    player.conn.write(token);

    const token2 = await player.conn.read();
    if (typeof token2 !== "string") return;
    if (token !== token2) return;

    conn.write("Authorized");
    const app = new App(player, conn);
    await this.authorized(app);
  }

  private async authorized(app: App) {
    const { player } = app;

    while (true) {
      app.conn.write("Action?");
      const action = await app.conn.read();
      if (typeof action !== "string") return;

      if (action === "getpos") {
        player.getpos();
      }

      if (action === "title") {
        app.conn.write("Title?");
        const title = await app.conn.read();
        if (typeof title !== "string") return;

        app.conn.write("Subtitle?");
        const subtitle = await app.conn.read();
        if (typeof subtitle !== "string") return;

        await player.title(title, subtitle);
      }

      if (action === "actionbar") {
        app.conn.write("Message?");
        const message = await app.conn.read();
        if (typeof message !== "string") return;

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
