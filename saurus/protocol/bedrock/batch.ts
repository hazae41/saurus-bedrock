import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { fromB64 } from "../../saurus.ts";
import { sha256, Aes256Cfb8, deflate, inflate } from "../../wasm.ts";

export interface BatchParams {
  secret: string;
  counters: [number, number];
  encryptor?: Aes256Cfb8;
  decryptor?: Aes256Cfb8;
}

export class BatchPacket extends ProtocolPacket {
  static id = 0xfe;

  constructor(
    public packets: Uint8Array[],
  ) {
    super();
  }

  static async from(buffer: Buffer) {
    const data = buffer.readArray(buffer.remaining);
    const decompressed = inflate(data);
    const payload = new Buffer(decompressed);

    const packets = [];

    while (payload.offset < payload.length) {
      packets.push(payload.readUVIntArray());
    }

    return new this(packets);
  }

  async to(buffer: Buffer) {
    super.to(buffer);

    const payload = Buffer.empty();
    for (const packet of this.packets) {
      payload.writeUVIntArray(packet);
    }

    const compressed = deflate(payload.array, undefined);

    buffer.writeArray(compressed);
  }
}

export function EncryptedBatchPacket(secret: string, name: string) {
  const bsecret = fromB64(secret);
  const iv = bsecret.slice(0, 16);

  const decryptor = new Aes256Cfb8(bsecret, iv);
  const encryptor = new Aes256Cfb8(bsecret, iv);

  const receive = { x: 0 };
  const send = { x: 0 };

  function makeHash(data: Uint8Array, counter: { x: number }) {
    const bcounter = Buffer.empty();
    bcounter.writeLLong(counter.x++);
    const acounter = bcounter.export();

    const asecret = fromB64(secret);

    const hash = sha256(acounter, data, asecret);

    return hash.slice(0, 8);
  }

  return class extends ProtocolPacket {
    static id = 0xfe;

    constructor(
      public packets: Uint8Array[],
    ) {
      super();
    }

    static async from(buffer: Buffer) {
      const full = buffer.readArray(buffer.remaining);

      decryptor.decrypt(full);

      const data = full.slice(0, -8);
      const checksum = full.slice(-8);

      console.log(name, receive.x);

      const hash = makeHash(data, receive);

      for (const [i, byte] of hash.entries()) {
        if (byte !== checksum[i]) throw new Error(`Corrupt ${name}`);
      }

      const decompressed = inflate(data);
      const payload = new Buffer(decompressed);

      const packets = [];

      while (payload.offset < payload.length) {
        packets.push(payload.readUVIntArray());
      }

      return new this(packets);
    }

    async to(buffer: Buffer) {
      super.to(buffer);

      console.log(name, send.x);

      const payload = Buffer.empty();
      for (const packet of this.packets) {
        payload.writeUVIntArray(packet);
      }

      const data = deflate(payload.array, undefined);
      const hash = makeHash(data, send);

      const encrypted = Buffer.empty();
      encrypted.writeArray(data);
      encrypted.writeArray(hash);

      encryptor.encrypt(encrypted.array);
      buffer.writeArray(encrypted.array);
    }
  };
}
