import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import * as wasm from "../../wasm.ts";
import {
  inflate,
  deflate,
  decrypt,
  encrypt,
  NodeProcess,
  NumberHolder,
} from "../../mod.ts";

import * as Base64 from "https://deno.land/std/encoding/base64.ts";

export interface BatchParams {
  secret: string;
  counter: NumberHolder;
  encryptor?: NodeProcess;
  decryptor?: NodeProcess;
}

export function BatchPacket(params?: BatchParams) {
  function hashOf(data: Uint8Array) {
    if (!params) throw Error("No params");
    const { secret, counter } = params;

    const bcounter = Buffer.empty();
    bcounter.writeLLong(counter.x++);
    const acounter = bcounter.export();

    const asecret = Base64.decode(secret);

    const hash = wasm.hashOf(acounter, data, asecret);

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
        const { secret, decryptor } = params;

        const full = await decrypt(decryptor, data, secret);

        data = full.slice(0, -8);
        const hash1 = full.slice(-8);
        const hash2 = hashOf(data);

        for (const [i, byte] of hash1.entries()) {
          if (byte !== hash2[i]) throw new Error("Corrupt");
        }
      }

      const unzipped = await inflate(data);
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

      let data = await deflate(payload.array);

      if (params?.encryptor) {
        const { secret, encryptor } = params;

        const full = new Buffer(data, data.length);
        full.writeArray(hashOf(data));

        data = await encrypt(encryptor, full.array, secret);
      }

      buffer.writeArray(data);
    }
  };
}
