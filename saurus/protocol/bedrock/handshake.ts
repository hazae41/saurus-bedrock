import { Buffer } from "../buffer.ts";
import { BedrockPacket } from "../mod.ts";
import { JWT } from "./jwt.ts";

export class ServerHandshakePacket extends BedrockPacket {
  static id = 0x03;

  constructor(
    public token: JWT,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    const token = buffer.readUVIntString();
    return new this(new JWT(token));
  }

  to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeUVIntString(this.token.token);
  }
}
