import {
  Saurus,
  AsyncEventResult,
  Protocol,
} from "../start.ts";
import { Session, DataType } from "../saurus/mod.ts";

const {
  Buffer,
  OfflinePong,
} = Protocol;

export class MOTD {
  constructor(readonly saurus: Saurus, readonly motd: string) {
    for (const handler of saurus.handlers) {
      handler.on(["session"], (session: Session) => {
        session.on(["output"], this.onoutput.bind(this));
      });
    }
  }

  private async onoutput(data: DataType): AsyncEventResult {
    if (data instanceof Uint8Array) {
      const buffer = new Buffer(data);

      if (buffer.header === OfflinePong.id) {
        const pong = OfflinePong.from(buffer);
        pong.infos.name = this.motd;
        return [await pong.export()];
      }
    }
  }
}
