import { Banhammer } from "./plugins/banhammer@1.0.ts";
import { Handler } from "./saurus/handler.ts";
import { Minecraft } from "./saurus/minecraft.ts";
import { Saurus, error, log } from "./saurus/saurus.ts";
import { MOTD } from "./plugins/motd@1.0.ts";
import { node } from "./saurus/node.ts";

const target = { hostname: "127.0.0.1", port: 19134 };
const handlers = [new Handler(19132, target)];
const saurus = new Saurus({ handlers });

const minecraft = new Minecraft(["minecraft/bedrock_server.exe"]);
saurus.on(["command", "low"], (line: string) => minecraft.write(line));
minecraft.read((line: string) => log(line, false));
minecraft.error((line: string) => error(line, false));
minecraft.on(["stopped"], () => node.kill());
minecraft.on(["stopped"], () => Deno.exit());
minecraft.sigint();

new Banhammer(saurus, minecraft);
new MOTD(saurus, "Hello world!");

await saurus.read();
