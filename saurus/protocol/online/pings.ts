import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";

export class OnlinePing extends ProtocolPacket {
  static id = 0x00;

  constructor(
    public sendPingTime: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const sendPingTime = buffer.readLong();
    return new this(sendPingTime);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeLong(this.sendPingTime);
  }
}

export class OnlinePong extends ProtocolPacket {
  static id = 0x03;

  constructor(
    public sendPingTime: number,
    public sendPongTime: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const sendPingTime = buffer.readLong();
    const sendPongTime = buffer.readLong();
    return new this(sendPingTime, sendPongTime);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeLong(this.sendPingTime);
    buffer.writeLong(this.sendPongTime);
  }
}
