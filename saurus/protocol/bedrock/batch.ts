import { ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { unzip, zip } from "../../mod.ts";

export const BatchPacket = (key?: Uint8Array) =>
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

      // if (key) {
      //   remaining = await node.decrypt(remaining, key);
      //   remaining = remaining.slice(0, remaining.length - 8);
      // }

      const unzipped = await unzip(remaining);
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
      console.log("zipping", array.length);
      const zipped = await zip(array);
      console.log("zipped");
      buffer.writeArray(zipped);
    }

    async export(): Promise<Uint8Array> {
      const buffer = Buffer.empty(32768);
      await this.to(buffer);
      return buffer.export();
    }
  };
