import { VersionedAddress, ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";

export class Open1Request extends ProtocolPacket {
  static id = 0x05;

  constructor(
    public protocol: number,
    public mtuSize: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.check(buffer);

    buffer.checkMagic();
    const protocol = buffer.readByte();
    const mtuSize = buffer.length - buffer.offset;

    return new this(protocol, mtuSize);
  }

  to(buffer: Buffer) {
    super.to(buffer);

    buffer.writeMagic();
    buffer.writeByte(this.protocol);

    for (let i = 0; i < this.mtuSize; i++) {
      buffer.writeByte(0);
    }
  }
}

export class Open1Reply extends ProtocolPacket {
  static id = 0x06;

  constructor(
    public mtuSize: number,
    public serverID: number,
    public security: boolean,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.check(buffer);

    buffer.checkMagic();
    const serverID = buffer.readLong();
    const mtuSize = buffer.readShort();
    const security = buffer.readBool();

    return new this(mtuSize, serverID, security);
  }

  to(buffer: Buffer) {
    super.to(buffer);

    buffer.writeMagic();
    buffer.writeLong(this.serverID);
    buffer.writeBool(this.security);
    buffer.writeShort(this.mtuSize);
  }
}

export class Open2Request extends ProtocolPacket {
  static id = 0x7;

  constructor(
    public serverAddress: VersionedAddress,
    public mtuSize: number,
    public clientID: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.check(buffer);

    buffer.checkMagic();
    const serverAddress = buffer.readAddress();
    const mtuSize = buffer.readShort();
    const clientID = buffer.readLong();

    return new this(serverAddress, mtuSize, clientID);
  }

  to(buffer: Buffer) {
    super.to(buffer);

    buffer.writeMagic();
    buffer.writeAddress(this.serverAddress);
    buffer.writeShort(this.mtuSize);
    buffer.writeLong(this.clientID);
  }
}

export class Open2Reply extends ProtocolPacket {
  static id = 0x8;

  constructor(
    public serverID: number,
    public clientAddress: VersionedAddress,
    public mtuSize: number,
    public security: boolean,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.check(buffer);

    buffer.checkMagic();
    const serverID = buffer.readLong();
    const clientAddress = buffer.readAddress();
    const mtuSize = buffer.readShort();
    const security = buffer.readBool();

    return new this(serverID, clientAddress, mtuSize, security);
  }

  to(buffer: Buffer) {
    super.to(buffer);

    buffer.writeMagic();
    buffer.writeLong(this.serverID);
    buffer.writeAddress(this.clientAddress);
    buffer.writeShort(this.mtuSize);
    buffer.writeBool(this.security);
  }
}
