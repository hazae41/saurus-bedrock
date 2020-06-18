import { Buffer } from "../buffer.ts";
import { BedrockPacket } from "../mod.ts";
import { JWT } from "./jwt.ts";

export class LoginPacket extends BedrockPacket {
  static id = 0x01;

  constructor(
    public protocol: number,
    public tokens: JWT[],
    public client: JWT,
  ) {
    super();
  }

  static from(buffer: Buffer): LoginPacket {
    const protocol = buffer.readInt();

    const sub = new Buffer(buffer.readUVIntArray());
    const data = JSON.parse(sub.readLIntString());

    const tokens: JWT[] = [];
    for (const token of data.chain) {
      tokens.push(new JWT(token));
    }

    const client = new JWT(sub.readLIntString());

    return new this(protocol, tokens, client);
  }

  to(buffer: Buffer) {
    super.to(buffer);

    buffer.writeInt(this.protocol);

    const chain: string[] = [];
    for (const token of this.tokens) {
      chain.push(token.token);
    }

    const data = { chain };

    const sub = Buffer.empty(524288);
    sub.writeLIntString(JSON.stringify(data));
    sub.writeLIntString(this.client.token);
    buffer.writeUVIntArray(sub.export());
  }

  async export(): Promise<Uint8Array> {
    const buffer = Buffer.empty(524288);
    await this.to(buffer);
    return buffer.export();
  }
}

export class DisconnectPacket extends BedrockPacket {
  static id = 0x05;

  constructor(
    public message: string,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    const hidden = buffer.readBool();
    const message = hidden ? "" : buffer.readUVIntString();
    return new this(message);
  }

  to(buffer: Buffer) {
    super.to(buffer);
    const hidden = !this.message;
    buffer.writeBool(hidden);
    if (hidden) return;
    buffer.writeUVIntString(this.message);
  }
}

export class PlayStatusPacket extends BedrockPacket {
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
    return new this(buffer.readInt());
  }

  to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeInt(this.status);
  }
}
