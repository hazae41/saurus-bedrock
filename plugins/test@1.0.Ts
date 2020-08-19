import { Minecraft } from "../saurus/minecraft.ts";
import { Players } from "../saurus/players.ts";

import { Friends } from "./friends@1.0.ts";

export class Test {
  constructor(
    readonly minecraft: Minecraft,
    readonly players: Players,
    readonly friends: Friends,
  ) {
    minecraft.on(["command"], (command: string) => {
      const [label, ...args] = command.trim().split(" ");

      if (label === "test") {
        const haz = players.names.get("hazae41");
        if (!haz) return;
        console.log(friends.friendsOf(haz));
        minecraft.info("It works!");
        return "cancelled";
      }
    });
  }
}
