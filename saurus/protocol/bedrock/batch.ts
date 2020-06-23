import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import {
  inflate,
  deflate,
  decrypt,
  encrypt,
  hashOf,
  NodeProcess,
  NumberHolder,
} from "../../mod.ts";

export interface BatchParams {
  secret: string;
  counter: NumberHolder;
  encryptor?: NodeProcess;
  decryptor?: NodeProcess;
}

export const BatchPacket = (params?: BatchParams) =>
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

      if (params?.decryptor) {
        const { secret, counter, decryptor } = params;

        const full = await decrypt(decryptor, remaining, secret);

        const data = full.slice(0, full.length - 8);
        const hash1 = full.slice(full.length - 8, full.length);
        const hash2 = await hashOf(data, counter.x++, secret);

        for (const [i, byte] of hash1.entries()) {
          if (byte !== hash2[i]) {
            console.log(full);
            throw new Error("Corrupt");
          }
        }

        remaining = data;
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

      if (params?.encryptor) {
        const { secret, counter, encryptor } = params;

        const hash = await hashOf(remaining, counter.x++, secret);

        const hashed = new Buffer(remaining, remaining.length);
        hashed.writeArray(hash.slice(0, 8));

        remaining = await encrypt(encryptor, hashed.export(), secret);
      }

      buffer.writeArray(remaining);
    }
  };
