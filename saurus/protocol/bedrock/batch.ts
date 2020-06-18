import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { inflate, deflate, decrypt, encrypt } from "../../mod.ts";

export const BatchPacket = (secret?: string) =>
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
      super.check(buffer);

      let remaining = buffer.readArray(buffer.remaining);

      if (secret) {
        //remaining = remaining.slice(0, remaining.length - 8);
        remaining = await decrypt(remaining, secret);
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

      const payload = Buffer.empty(524288);

      for (const packet of this.packets) {
        payload.writeUVIntArray(packet);
      }

      const array = payload.export();
      const zipped = await deflate(array);

      let remaining = zipped;

      if (secret) {
        remaining = await encrypt(remaining, secret);
      }

      buffer.writeArray(zipped);
    }

    async export(): Promise<Uint8Array> {
      const buffer = Buffer.empty(32768);
      await this.to(buffer);
      return buffer.export();
    }
  };
