import {
  Saurus,
  AsyncEventResult,
  Protocol,
} from "../start.ts";
import { Session, DataType } from "../saurus/mod.ts";
import { ProtocolPacket } from "../saurus/protocol/mod.ts";

const {
  Buffer,
  OfflinePong,
} = Protocol;

export class MOTD {
  constructor(readonly saurus: Saurus, readonly motd: string) {
    for (const handler of saurus.handlers) {
      handler.on(["session"], (session: Session) => {
        session.on(["data-out"], this.onoutput.bind(this));
      });
    }
  }

  private async onoutput(data: Uint8Array): AsyncEventResult {
    const buffer = new Buffer(data);
    const id = ProtocolPacket.header(buffer);

    if (id === OfflinePong.id) {
      const pong = OfflinePong.from(buffer);
      pong.infos.name = this.motd;
      return [await pong.export()];
    }
  }
}
