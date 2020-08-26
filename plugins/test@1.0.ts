import { Minecraft } from "../start.ts";

export class Test {
  constructor(
    readonly minecraft: Minecraft,
  ) {
    minecraft.on(["command"], (command: string) => {
      const [label, ...args] = command.trim().split(" ");

      if (label === "test") {
        minecraft.info("It works!");
        return "cancelled";
      }
    });
  }
}
