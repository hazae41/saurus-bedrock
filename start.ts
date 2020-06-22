export * from "./saurus/mod.ts";

import {
  Saurus,
  Handler,
  Minecraft,
} from "./saurus/mod.ts";

import { Banhammer } from "./plugins/banhammer@1.0.ts";
import { MOTD } from "./plugins/motd@1.0.ts";

const target = { hostname: "127.0.0.1", port: 19132 };
const handlers = [new Handler(19134, target)];
const saurus = new Saurus({ handlers });

const command = "minecraft/bedrock_server.exe";
const minecraft = new Minecraft(saurus, command);

new Banhammer(saurus, minecraft);
new MOTD(saurus, "Hello world");

await saurus.read();
