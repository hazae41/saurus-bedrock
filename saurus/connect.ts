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
    const type = await conn.read();
    if (typeof type !== "string") return;

    if (type === "connect") this.connect(conn);
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

    const code = new Random().string(5);
    player.actionbar(`Code: ${code}`);
    conn.write("Code?");

    while (true) {
      const code2 = await conn.read();
      if (typeof code2 !== "string") return;

      if (code2 !== code) {
        conn.write("Invalid code");
      } else {
        conn.write("Success");
        break;
      }
    }

    player.actionbar("Connected!");
    player.connection = conn;
  }
}

export class App {
  constructor(
    readonly player: Player,
    readonly conn: WSConnection,
  ) {}
}
