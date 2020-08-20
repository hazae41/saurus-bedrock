import { Minecraft } from "./saurus/minecraft.ts";
import { Players, Player } from "./saurus/players.ts";
import { WSHandler, WSConnection } from "./saurus/websockets.ts";
import { Connector } from "./saurus/connect.ts";
import * as Files from "./saurus/files.ts";

import { JoinTitle } from "./plugins/jointitle@1.0.ts";
import { Test } from "./plugins/test@1.0.ts";

export * from "./saurus/mod.ts";

const logs = Deno.openSync("logs.txt", Files.Append);

const command = "minecraft/bedrock_server.exe";
const minecraft = new Minecraft(command, logs);

const connector = new Connector(minecraft, 8081);

new JoinTitle(minecraft);
new Test(minecraft);
