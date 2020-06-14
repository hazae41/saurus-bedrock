import { Buffer } from "../buffer.ts";
import { BedrockPacket } from "../mod.ts";
import { JWT } from "./jwt.ts";

export class ServerToClientHandshakePacket extends BedrockPacket {
  static id = 0x03;

  constructor(
    public jwt: JWT,
  ) {
    super();
  }

  static from(buffer: Buffer) {
    super.check(buffer);
    const compact = buffer.readUVIntString();
    const jwt = new JWT(compact);
    return new this(jwt);
  }

  to(buffer: Buffer) {
    super.to(buffer);
    buffer.writeUVIntString(this.jwt.export());
  }
}
