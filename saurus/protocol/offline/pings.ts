import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";

export class OfflinePing extends ProtocolPacket {
  static id = 0x01;

  constructor(
    public time: number,
    public clientID: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const time = buffer.readLong();
    buffer.checkMagic();
    const clientID = buffer.readLong();
    return new this(time, clientID);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeLong(this.time);
    buffer.writeMagic();
    buffer.writeLong(this.clientID);
  }
}

export interface OfflinePongInfos {
  game: string;
  name: string;
  protocol: number;
  version: string;
  onlinePlayers: number;
  maxPlayers: number;
  serverID: number;
  software: string;
  gamemode: string;
}

export class OfflinePong extends ProtocolPacket {
  static id = 0x1c;

  constructor(
    public time: number,
    public serverID: number,
    public infos: OfflinePongInfos,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const time = buffer.readLong();
    const serverID = buffer.readLong();
    buffer.checkMagic();

    const infostr = buffer.readShortString().split(";");

    const infos = {
      game: infostr[0],
      name: infostr[1],
      protocol: Number(infostr[2]),
      version: infostr[3],
      onlinePlayers: Number(infostr[4]),
      maxPlayers: Number(infostr[5]),
      serverID: Number(infostr[6]),
      software: infostr[7],
      gamemode: infostr[8],
    };

    return new this(time, serverID, infos);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeLong(this.time);
    buffer.writeLong(this.serverID);
    buffer.writeMagic();

    const { infos } = this;

    const infostr = [
      infos.game,
      infos.name,
      infos.protocol.toString(),
      infos.version,
      infos.onlinePlayers.toString(),
      infos.maxPlayers.toString(),
      infos.serverID,
      infos.software,
      infos.gamemode,
    ].join(";");

    buffer.writeShortString(infostr);
  }
}

export class IncompatibleProtocol extends ProtocolPacket {
  static id = 0x19;

  constructor(
    public protocol: number,
    public serverID: number,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const protocol = buffer.readByte();
    buffer.checkMagic();
    const serverID = buffer.readLong();
    return new this(protocol, serverID);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeByte(this.protocol);
    buffer.writeMagic();
    buffer.writeLong(this.serverID);
  }
}
