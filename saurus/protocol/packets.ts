import { Address } from "../handler.ts";
import { Buffer } from "./buffer.ts";

export interface VersionedAddress extends Address {
  version: 4 | 6;
}

export abstract class Packet {
  static id: number;

  get id() {
    const type = <typeof Packet> this.constructor;
    return type.id;
  }

  to(buffer: Buffer): Promise<void> | void {}

  async export(): Promise<Uint8Array> {
    const buffer = Buffer.empty();
    await this.to(buffer);
    return buffer.export();
  }
}

export abstract class ProtocolPacket extends Packet {
  static header(buffer: Buffer) {
    return buffer.readByte();
  }

  to(buffer: Buffer) {
    buffer.writeByte(this.id);
  }
}

export abstract class BedrockPacket extends Packet {
  static header(buffer: Buffer) {
    return buffer.readUVInt();
  }

  to(buffer: Buffer) {
    buffer.writeUVInt(this.id);
  }
}
