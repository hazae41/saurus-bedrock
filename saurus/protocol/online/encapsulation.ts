import { Packet } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import {
  isReliable,
  isOrdered,
  isSequenced,
  Unreliable,
} from "./reliability.ts";

export interface EncapsulatedPacketParams {
  reliability?: number;
  sub?: Uint8Array;
  index?: number;
  sequence?: number;
  order?: { index: number; channel: number };
  split?: { count: number; id: number; index: number };
}

export class EncapsulatedPacket extends Packet {
  static reliability_shift = 5;
  static reliability_flags = 0b111 << EncapsulatedPacket.reliability_shift;
  static split_flag = 0b00010000;

  reliability = Unreliable;
  sub = new Uint8Array([]);
  index?: number;
  sequence?: number;
  order?: { index: number; channel: number };
  split?: { count: number; id: number; index: number };

  constructor(params: EncapsulatedPacketParams) {
    super();
    Object.assign(this, params);
  }

  static from(buffer: Buffer) {
    const flags = buffer.readByte();

    const { reliability_shift, reliability_flags } = this;
    const reliability = (flags & reliability_flags) >> reliability_shift;
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
      const channel = buffer.readByte();
      order = { index, channel };
    }

    if (splitted) {
      const count = buffer.readInt();
      const id = buffer.readShort();
      const index = buffer.readInt();
      split = { count, id, index };
    }

    const sub = buffer.readArray(length);

    return new this({ reliability, sub, index, sequence, order, split });
  }

  to(buffer: Buffer) {
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
      buffer.writeByte(order!!.channel);
    }

    if (split) {
      const { count, id, index } = split;
      buffer.writeInt(count);
      buffer.writeShort(id);
      buffer.writeInt(index);
    }

    if (!sub) throw Error("No sub");
    buffer.writeArray(sub);
  }
}
