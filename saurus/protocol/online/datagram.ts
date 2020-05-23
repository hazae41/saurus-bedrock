import { Packet } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { EncapsulatedPacket } from "./encapsulation.ts";

export class Datagram extends Packet {
  static flag_valid = 0x80;
  static flag_ack = 0x40;
  static flag_nak = 0x20;

  packets: EncapsulatedPacket[] = [];
  headerFlags = 0;
  seqNumber?: number;
  sendTime?: number;

  static from(buffer: Buffer) {
    const it = new this();
    it.headerFlags = buffer.readByte();
    it.seqNumber = buffer.readLTriad();

    while (buffer.offset < buffer.length) {
      const encap = EncapsulatedPacket.from(buffer);
      it.packets.push(encap);
    }

    return it;
  }

  async to(buffer: Buffer) {
    buffer.writeByte(Datagram.flag_valid | this.headerFlags);
    buffer.writeLTriad(this.seqNumber!!);
    for (const packet of this.packets) packet.to(buffer);
  }
}
