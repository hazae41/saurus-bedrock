import { AsyncEventResult } from "../saurus/events.ts";
import { Buffer } from "../saurus/protocol/buffer.ts";
import { OfflinePong } from "../saurus/protocol/offline/pings.ts";
import { Saurus } from "../saurus/saurus.ts";

export class MOTD {
  constructor(readonly saurus: Saurus, readonly motd: string) {
    for (const handler of saurus.handlers) {
      handler.on(["data"], this.ondata.bind(this));
    }
  }

  private async ondata(data: Uint8Array): AsyncEventResult {
    const buffer = new Buffer(data);

    if (buffer.header === OfflinePong.id) {
      const pong = OfflinePong.from(buffer);
      pong.infos.name = this.motd;
      return [await pong.export()];
    }
  }
}
