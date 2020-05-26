import { Packet, ProtocolPacket } from "../packets.ts";
import { Buffer } from "../buffer.ts";
import { node } from "../../node.ts";

const log = await Deno.open(
  "log.txt",
  { write: true, create: true, truncate: true },
);

export abstract class DataPacket extends Packet {
  static from(buffer: Buffer) {
    const id = buffer.readUVInt();
    if (this.id === id) return;
    throw Error("Could not check packet ID");
  }

  async to(buffer: Buffer) {
    const { id } = <typeof Packet> this.constructor;
    buffer.writeUVInt(id);
  }
}

export class BatchPacket extends ProtocolPacket {
  static id = 0xfe;
  packets: Uint8Array[];

  constructor(
    ...packets: Uint8Array[]
  ) {
    super();
    this.packets = packets;
  }

  static async from(buffer: Buffer) {
    super.from(buffer);

    const remaining = buffer.readArray(buffer.remaining);
    const unzipped = await node.unzip(remaining);

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
    const zipped = await node.zip(array);
    buffer.writeArray(zipped);
  }
}
