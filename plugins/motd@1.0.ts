import {
  Saurus,
  AsyncEventResult,
  Protocol,
} from "../start.ts";

const {
  Buffer,
  OfflinePong,
} = Protocol;

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
