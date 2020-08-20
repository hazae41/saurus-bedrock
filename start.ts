import { Minecraft } from "./saurus/minecraft.ts";
import { Connector } from "./saurus/connect.ts";
import * as Files from "./saurus/files.ts";

import { JoinTitle } from "./plugins/jointitle@1.0.ts";
import { Test } from "./plugins/test@1.0.ts";

export * from "./saurus/mod.ts";

const logs = Deno.openSync("logs.txt", Files.Append);

const command = "minecraft/bedrock_server.exe";
const minecraft = new Minecraft(command, logs);

const connector = new Connector(minecraft, 19134, /*ssl*/ true);

new JoinTitle(minecraft);
new Test(minecraft);
