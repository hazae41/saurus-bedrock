import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { inflate, deflate, decrypt, encrypt, hashOf } from "../../mod.ts";

export const BatchPacket = (counter = 0, secret?: string) =>
  class extends ProtocolPacket {
    static id = 0xfe;
    packets: Uint8Array[];

    constructor(
      ...packets: Uint8Array[]
    ) {
      super();
      this.packets = packets;
    }

    static async from(buffer: Buffer) {
      let remaining = buffer.readArray(buffer.remaining);

      if (secret) {
        remaining = await decrypt(remaining, secret);
        remaining = remaining.slice(0, remaining.length - 8);
      }

      const unzipped = await inflate(remaining);
      const payload = new Buffer(unzipped);

      const packets = [];
      while (payload.offset < payload.length) {
        packets.push(payload.readUVIntArray());
      }

      return new this(...packets);
    }

    async to(buffer: Buffer) {
      super.to(buffer);

      const payload = Buffer.empty();
      for (const packet of this.packets) {
        payload.writeUVIntArray(packet);
      }

      const array = payload.export();
      const zipped = await deflate(array);

      let remaining = zipped;

      if (secret) {
        const hash = await hashOf(remaining, counter - 1, secret);
        const hashed = new Buffer(remaining, remaining.length);
        hashed.writeArray(hash.slice(0, 8));
        remaining = await encrypt(hashed.export(), secret);
      }

      buffer.writeArray(remaining);
    }
  };
