import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { Aes256Cfb8, inflate, deflate, sha256 } from "../../wasm.ts";
import { fromB64 } from "../../saurus.ts";

export interface BatchParams {
  secret: string;
  counter: { x: number };
  encryptor?: Aes256Cfb8;
  decryptor?: Aes256Cfb8;
}

export function BatchPacket(params?: BatchParams) {
  function makeHash(data: Uint8Array) {
    if (!params) throw Error("No params");
    const { secret, counter } = params;

    const bcounter = Buffer.empty();
    bcounter.writeLLong(counter.x++);
    const acounter = bcounter.export();

    const asecret = fromB64(secret);

    const hash = sha256(acounter, data, asecret);

    return hash.slice(0, 8);
  }

  return class extends ProtocolPacket {
    static id = 0xfe;
    packets: Uint8Array[];

    constructor(
      ...packets: Uint8Array[]
    ) {
      super();
      this.packets = packets;
    }

    static async from(buffer: Buffer) {
      let data = buffer.readArray(buffer.remaining);

      if (params?.decryptor) {
        const { decryptor } = params;

        decryptor.decrypt(data);

        const hash = data.slice(-8);
        data = data.slice(0, -8);

        for (const [i, byte] of makeHash(data).entries()) {
          if (byte !== hash[i]) throw new Error("Corrupt");
        }
      }

      const decompressed = inflate(data);
      const payload = new Buffer(decompressed);

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

      const compressed = deflate(payload.array);

      if (params?.encryptor) {
        const { encryptor } = params;

        const encrypted = Buffer.empty();
        encrypted.writeArray(compressed);
        encrypted.writeArray(makeHash(compressed));

        encryptor.encrypt(encrypted.array);
        buffer.writeArray(encrypted.array);
      } else {
        buffer.writeArray(compressed);
      }
    }
  };
}
