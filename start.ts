import { Minecraft } from "./saurus/minecraft.ts";
import { Connector } from "./saurus/connect.ts";

import { JoinTitle } from "./plugins/jointitle@1.0.ts";
import { Test } from "./plugins/test@1.0.ts";

export * from "./saurus/mod.ts";

const minecraft = new Minecraft();

const connector = new Connector(minecraft, 19134, /*ssl*/ true);

new JoinTitle(minecraft);
new Test(minecraft);
