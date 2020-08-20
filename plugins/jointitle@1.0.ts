import { Minecraft } from "../saurus/minecraft.ts"
import { Players, Player } from "../saurus/players.ts";

const config = {
  title: "Welcome",
  subtitle: "to Saurus",
};

export class JoinTitle {
  constructor(
    readonly minecraft: Minecraft,
  ) {
    const { title, subtitle } = config;

    minecraft.players.on(["spawn"], (player: Player) => {
      setTimeout(() => {
        if (!player.spawned) return;
        player.title(title, subtitle);
      }, 2000);
    });
  }
}
