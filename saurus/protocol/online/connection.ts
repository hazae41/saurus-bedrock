import { VersionedAddress, ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";

export class ConnectionRequest extends ProtocolPacket {
  static id = 0x09;

  constructor(
    public clientID: number,
    public sendPingTime: number,
    public useSecurity = false,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const clientID = buffer.readLong();
    const sendPingTime = buffer.readLong();
    const useSecurity = buffer.readBool();
    return new this(clientID, sendPingTime, useSecurity);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeLong(this.clientID);
    buffer.writeLong(this.sendPingTime);
    buffer.writeBool(this.useSecurity);
  }
}

export class ConnectionRequestAccepted extends ProtocolPacket {
  static id = 0x10;

  constructor(
    public address: VersionedAddress,
    public systemAddresses: VersionedAddress[],
    public sendPingTime: number,
    public sendPongTime: number,
  ) {
    super();
    if (this.systemAddresses.length) return;
    const local = { hostname: "127.0.0.1", port: 0, version: 4 as 4 };
    this.systemAddresses.push(local);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeAddress(this.address);
    buffer.writeShort(0);

    const dummy = { hostname: "0.0.0.0", port: 0, version: 4 as 4 };
    for (let i = 0; i < 20; i++) {
      const address = this.systemAddresses[i];
      buffer.writeAddress(address || dummy);
    }

    buffer.writeLong(this.sendPingTime);
    buffer.writeLong(this.sendPongTime);
  }
}

export class NewIncomingConnection extends ProtocolPacket {
  static id = 0x13;

  constructor(
    public address: VersionedAddress,
    public systemAddresses: VersionedAddress[],
    public sendPingTime: number,
    public sendPongTime: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const address = buffer.readAddress();
    const dummy = { hostname: "0.0.0.0", port: 0, version: 4 as 4 };
    const addresses = [];
    for (let i = 0; i < 20; i++) {
      if (buffer.length - buffer.offset > 16) {
        addresses.push(buffer.readAddress());
      } else {
        addresses.push({ ...dummy });
      }
    }
    const sendPingTime = buffer.readLong();
    const sendPongTime = buffer.readLong();
    return new this(address, addresses, sendPingTime, sendPongTime);
  }

  async to(buffer: Buffer) {}
}

export class DisconnectNotification extends ProtocolPacket {
  static id = 0x15;

  static from(buffer: Buffer) {
    super.from(buffer);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
  }
}
