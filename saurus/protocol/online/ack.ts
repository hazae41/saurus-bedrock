import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";

export class AcknowledgePacket extends ProtocolPacket {
  constructor(
    public packets: number[],
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const packets = [];
    const count = buffer.readShort();
    for (let i = 0; i < count; i++) {
      if (!buffer.remaining) break;
      if (packets.length > 4096) break;

      const single = buffer.readBool();

      if (single) {
        const seq = buffer.readLTriad();
        packets.push(seq);
        continue;
      }

      const start = buffer.readLTriad();
      let end = buffer.readLTriad();

      if ((end - start) > 512) end = start + 512;
      for (let i = start; i <= end; i++) packets.push(i);
    }

    return new this(packets);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeShort(this.packets.length);
    this.packets.sort((a, b) => a - b);
    for (const seq of this.packets) {
      buffer.writeBool(true);
      buffer.writeLTriad(seq);
    }
  }
}

export class ACK extends AcknowledgePacket {
  static id = 0xc0;
}

export class NACK extends AcknowledgePacket {
  static id = 0xa0;
}
