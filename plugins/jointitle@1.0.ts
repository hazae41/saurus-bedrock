import { Players, Player } from "../saurus/players.ts";

const config = {
  title: "Welcome",
  subtitle: "to Minecraft",
};

export class JoinTitle {
  constructor(
    readonly players: Players,
  ) {
    const { title, subtitle } = config;

    players.on(["spawn"], (player: Player) => {
      setTimeout(() => {
        if (!player.spawned) return;
        player.title(title, subtitle);
      }, 2000);
    });
  }
}
