export * from "./saurus/mod.ts";

import {
  Saurus,
  Handler,
  Minecraft,
  Logger,
  test,
} from "./saurus/mod.ts";

import { Banhammer } from "./plugins/banhammer@1.0.ts";
import { MOTD } from "./plugins/motd@1.0.ts";
import { Buffer } from "./saurus/protocol/mod.ts";

const target = { hostname: "127.0.0.1", port: 19132 };
const handlers = [new Handler(19134, target)];
const saurus = new Saurus({ handlers });

const minecraft = new Minecraft(["minecraft/bedrock_server.exe"]);
saurus.on(["command", "low"], (line: string) => minecraft.write(line));
minecraft.read((line: string) => Logger.log(line));
minecraft.error((line: string) => Logger.error(line));
minecraft.on(["stopped", "low"], () => Deno.exit());
minecraft.sigint();

new Banhammer(saurus, minecraft);
new MOTD(saurus, "Hello world");

await saurus.read();
