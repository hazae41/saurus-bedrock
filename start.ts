import { Minecraft, Connector } from "./saurus/mod.ts";

import { JoinTitle } from "./plugins/jointitle@1.0.ts";
import { PingTitle } from "./plugins/pingtitle@1.0.ts"
import { Test } from "./plugins/test@1.0.ts";

export * from "./saurus/mod.ts";

const minecraft = new Minecraft();

new Connector(minecraft, {
  port: 19134,
  hostname: "sunship.tk",
  certFile: "./ssl/fullchain.pem",
  keyFile: "./ssl/privkey.pem",
});

new PingTitle(minecraft);
new JoinTitle(minecraft);
new Test(minecraft);
