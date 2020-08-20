import { Minecraft } from "./saurus/minecraft.ts";
import { Connector } from "./saurus/connect.ts";

import { JoinTitle } from "./plugins/jointitle@1.0.ts";
import { Test } from "./plugins/test@1.0.ts";

export * from "./saurus/mod.ts";

const minecraft = new Minecraft();

const connector = new Connector(minecraft, {
  port: 19134,
  hostname: "sunship.tk",
  certFile: "./ssl/fullchain.pem",
  keyFile: "./ssl/privkey.pem",
});

new JoinTitle(minecraft);
new Test(minecraft);
