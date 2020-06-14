import { Packet } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { EncapsulatedPacket } from "./encapsulation.ts";
import { ACK, NACK } from "./ack.ts";

export function datagramOf(
  data: Uint8Array,
): Datagram | ACK | NACK | undefined {
  const buffer = new Buffer(data);
  const { header } = buffer;

  const valid = header & Datagram.flag_valid;
  const ack = header & Datagram.flag_ack;
  const nak = header & Datagram.flag_nak;

  if (ack) return ACK.from(buffer);
  if (nak) return NACK.from(buffer);
  if (valid) return Datagram.from(buffer);
}

export class Datagram extends Packet {
  static flag_valid = 0x80;
  static flag_ack = 0x40;
  static flag_nak = 0x20;

  constructor(
    public headerFlags = 0,
    public seqNumber = 0,
    public packets: EncapsulatedPacket[] = [],
  ) {
    super();
  }

  static from(buffer: Buffer) {
    const headerFlags = buffer.readByte();
    const seqNumber = buffer.readLTriad();

    const packets = [];
    while (buffer.remaining) {
      packets.push(EncapsulatedPacket.from(buffer));
    }

    return new this(headerFlags, seqNumber, packets);
  }

  async to(buffer: Buffer) {
    buffer.writeByte(Datagram.flag_valid | this.headerFlags);
    buffer.writeLTriad(this.seqNumber!!);

    for (const packet of this.packets) {
      packet.to(buffer);
    }
  }
}
