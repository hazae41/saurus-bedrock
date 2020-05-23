import { Address } from "../handler.ts";
import { Buffer } from "./buffer.ts";

export interface VersionedAddress extends Address {
  version: 4 | 6;
}

export abstract class Packet {
  static id: number;

  abstract async to(buffer: Buffer): Promise<void>;

  async export(): Promise<Uint8Array> {
    const output = Buffer.empty();
    await this.to(output);
    return output.export();
  }
}

export abstract class ProtocolPacket extends Packet {
  static from(buffer: Buffer) {
    if (this.id === buffer.readByte()) return;
    throw new Error("Could not check packet ID");
  }

  async to(buffer: Buffer) {
    const { id } = <typeof Packet> this.constructor;
    buffer.writeByte(id);
  }
}
