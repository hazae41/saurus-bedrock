import { Buffer } from "../buffer.ts";
import { DataPacket } from "./batch.ts";

function decodeJWT(token: string): any {
  const [head, payload, sig] = token.split(".");
  const translated = payload.split("-_").join("+/");
  const decoded = atob(translated);
  return JSON.parse(decoded);
}

export class LoginPacket extends DataPacket {
  static id = 0x01;

  name?: string;
  uuid?: string;
  XUID?: string;
  publicKey?: string;
  locale?: string;
  clientID?: number;
  clientData: any;

  constructor(
    public protocol: number,
  ) {
    super();
  }

  static from(buffer: Buffer): LoginPacket {
    super.from(buffer);
    const protocol = buffer.readInt();
    const packet = new this(protocol);

    const sub = new Buffer(buffer.readUVIntArray());

    const data = JSON.parse(sub.readLIntString());
    let extra = false;
    for (const chain of data.chain) {
      const token = decodeJWT(chain);

      if (token.extraData) {
        if (extra) throw Error("Multiple extra data");
        extra = true;
        const { extraData } = token;
        packet.name = extraData.displayName;
        packet.uuid = extraData.identity;
        packet.XUID = extraData.XUID;
      }

      if (token.identityPublicKey) {
        packet.publicKey = token.identityPublicKey;
      }
    }

    const clientData = decodeJWT(sub.readLIntString());

    packet.clientData = clientData;
    packet.clientID = clientData.ClientRandomId;
    packet.locale = clientData.LanguageCode;

    return packet;
  }
}

export class DisconnectPacket extends DataPacket {
  static id = 0x05;

  constructor(
    public message: string,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.from(buffer);
    const hidden = buffer.readBool();
    const message = hidden ? "" : buffer.readUVIntString();
    return new this(message);
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    const hidden = !this.message;
    buffer.writeBool(hidden);
    if (hidden) return;
    buffer.writeUVIntString(this.message);
  }
}

export class PlayStatusPacket extends DataPacket {
  static id = 0x02;

  static LOGIN_SUCCESS = 0;
  static LOGIN_FAILED_CLIENT = 1;
  static LOGIN_FAILED_SERVER = 2;
  static PLAYER_SPAWN = 3;
  static LOGIN_FAILED_INVALID_TENANT = 4;
  static LOGIN_FAILED_VANILLA_EDU = 5;
  static LOGIN_FAILED_EDU_VANILLA = 6;
  static LOGIN_FAILED_SERVER_FULL = 7;

  constructor(
    public status: number,
  ) {
    super();
  }

  static from(buffer: Buffer): PlayStatusPacket {
    super.from(buffer);
    return new this(buffer.readInt());
  }

  async to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeInt(this.status);
  }
}
