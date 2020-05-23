import { DataPacket } from "./batch.ts";
import { Buffer } from "../buffer.ts";

export class ServerToClientHandshakePacket extends DataPacket {
  static id = 0x03;

  constructor(
    public jwt: Uint8Array,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    return new this(buffer.remaining);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeArray(this.jwt);
  }
}
