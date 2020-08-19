import { Minecraft } from "./saurus/minecraft.ts";
import { Players, Player } from "./saurus/players.ts";
import { WSHandler, WSConnection } from "./saurus/websockets.ts";
import { Connector } from "./saurus/connect.ts";
import * as Files from "./saurus/files.ts";

import { JoinTitle } from "./plugins/jointitle@1.0.ts";
import { Test } from "./plugins/test@1.0.ts";
import { Friends } from "./plugins/friends@1.0.ts";

export * from "./saurus/mod.ts";

const logs = Deno.openSync("log.txt", Files.Append);

const command = "minecraft/bedrock_server.exe";
const minecraft = new Minecraft(command, logs);
const players = new Players(minecraft);

const connector = new Connector(players, 8081);

const friends = new Friends(players);

new JoinTitle(players);
new Test(minecraft, players, friends);
