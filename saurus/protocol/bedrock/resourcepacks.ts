import { BedrockPacket } from "../mod.ts";
import { Buffer } from "../buffer.ts";

export enum ResourcePackStatus {
  Refused = 1,
  SendPacks = 2,
  HaveAllPacks = 3,
  Completed = 4,
}

export class ResourcePackResponse extends BedrockPacket {
  static id = 0x08;

  constructor(
    public status: ResourcePackStatus,
    public data: Uint8Array,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    const status = buffer.readByte();
    const data = buffer.readArray(buffer.remaining);
    return new this(status, data);
  }

  to(buffer: Buffer) {
    buffer.writeByte(this.status);
    buffer.writeArray(this.data);
  }
}
