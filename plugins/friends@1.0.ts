import { Players, Player } from "../saurus/players.ts";
import { App } from "../saurus/connect.ts";

export class Friends {
  xuids = new Map<number, number[]>();

  constructor(
    readonly players: Players,
  ) {
    this.xuids.set(2535434693526619, [2535434693526619]);
  }

  private async handle(app: App) {
    const { conn, player } = app;
    const action = await app.conn.read();

    if (action === "list") this.list(app);
  }

  private async list(app: App) {
    const { conn, player } = app;
    return this.friendsOf(player);
  }

  friendsOf(player: Player) {
    const friends = this.xuids.get(player.xuid);
    if (!friends) return [];
    return this.players.nameOf(...friends);
  }
}
