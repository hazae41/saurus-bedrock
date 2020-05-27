import {
  Saurus,
  Minecraft,
  Logger,
  AsyncEventResult,
} from "../start.ts";

const { info } = Logger;

export class Banhammer {
  constructor(
    readonly saurus: Saurus,
    readonly minecraft: Minecraft,
  ) {
    saurus.on(["command"], this.oncommand.bind(this));
    minecraft.on(["started"], () => info("Banhammer started"));
  }

  async oncommand(line: string): AsyncEventResult {
    const [label, ...args] = line.trim().split(" ");
    if (label !== "ban") return;

    const [name, ...extra] = args;
    const cause = extra.join(" ");
    info(`Banned ${name} for ${cause}`);

    return "cancelled";
  }
}
