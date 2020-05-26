import { Packet } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { isReliable, isOrdered, isSequenced } from "./reliability.ts";

export function inRange(n: number, [start, end]: number[]) {
  return n >= start && n <= end;
}

export class OrderChannel {
  constructor(readonly x: number) {
    if (!inRange(x, [0, 32])) throw Error("Invalid order channel");
  }
}

export class EncapsulatedPacket extends Packet {
  static reliability_shift = 5;
  static reliability_flags = 0b111 << EncapsulatedPacket.reliability_shift;
  static split_flag = 0b00010000;

  constructor(
    public reliability: number,
    public sub: Uint8Array,
  ) {
    super();
  }

  index?: number;
  sequence?: number;

  order?: {
    index: number;
    channel: OrderChannel;
  };

  split?: {
    count: number;
    id: number;
    index: number;
  };

  static from(buffer: Buffer) {
    const flags = buffer.readByte();

    const reliability = (flags & this.reliability_flags) >>
      this.reliability_shift;
    const splitted = (flags & this.split_flag) > 0;

    const length = Math.ceil(buffer.readShort() / 8);
    if (!length) throw Error("Invalid length");

    let index, sequence, order, split;

    if (isReliable(reliability)) {
      index = buffer.readLTriad();
    }

    if (isSequenced(reliability)) {
      sequence = buffer.readLTriad();
    }

    if (isSequenced(reliability) || isOrdered(reliability)) {
      const index = buffer.readLTriad();
      const channel = new OrderChannel(buffer.readByte());
      order = { index, channel };
    }

    if (splitted) {
      const count = buffer.readInt();
      const id = buffer.readShort();
      const index = buffer.readInt();
      split = { count, id, index };
    }

    const sub = buffer.readArray(length);
    const packet = new this(reliability, sub);
    packet.index = index;
    packet.sequence = sequence;
    packet.order = order;
    packet.split = split;
    return packet;
  }

  async to(buffer: Buffer) {
    const { reliability, split, order, sub } = this;

    const rflag = reliability << EncapsulatedPacket.reliability_shift;
    const sflag = split ? EncapsulatedPacket.split_flag : 0;
    buffer.writeByte(rflag | sflag);
    buffer.writeShort(sub!!.length << 3);

    if (isReliable(reliability)) {
      buffer.writeLTriad(this.index!!);
    }

    if (isSequenced(reliability)) {
      buffer.writeLTriad(this.sequence!!);
    }

    if (isSequenced(reliability) || isOrdered(reliability)) {
      buffer.writeLTriad(order!!.index);
      buffer.writeByte(order!!.channel.x);
    }

    if (split) {
      const { count, id, index } = split;
      buffer.writeInt(count);
      buffer.writeShort(id);
      buffer.writeInt(index);
    }

    buffer.writeArray(sub!!);
  }
}
