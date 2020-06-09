export * from "./saurus/mod.ts";

import {
  Saurus,
  Handler,
  Minecraft,
  Logger,
  node,
} from "./saurus/mod.ts";

import { Banhammer } from "./plugins/banhammer@1.0.ts";
import { MOTD } from "./plugins/motd@1.0.ts";

const target = { hostname: "127.0.0.1", port: 19134 };
const handlers = [new Handler(19132, target)];
const saurus = new Saurus({ handlers });

const minecraft = new Minecraft(["minecraft/bedrock_server.exe"]);
saurus.on(["command", "low"], (line: string) => minecraft.write(line));
minecraft.read((line: string) => Logger.log(line, false));
minecraft.error((line: string) => Logger.error(line, false));
minecraft.on(["stopped", "low"], () => node.kill());
minecraft.on(["stopped", "low"], () => Deno.exit());
minecraft.sigint();

new Banhammer(saurus, minecraft);
new MOTD(saurus, "Hello world");

await saurus.read();
