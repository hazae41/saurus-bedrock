import {
  Buffer,
  Datagram,
  ACK,
  NACK,
  EncapsulatedPacket,
  OfflinePong,
  Open2Reply,
  BatchPacket,
  DisconnectNotification,
  ConnectionRequestAccepted,
  ServerToClientHandshakePacket,
  LoginPacket,
  Open2Request,
} from "./protocol/mod.ts";

import {
  EventEmitter,
  inRange,
  node,
  DiffieHellman,
  encode,
  decode,
  KeyPair,
} from "./mod.ts";
import { Address, Listener, Origin, origin } from "./handler.ts";

function datagramOf(buffer: Buffer) {
  const { header } = buffer;

  const valid = header & Datagram.flag_valid;
  if (!valid) return;

  const ack = header & Datagram.flag_ack;
  const nak = header & Datagram.flag_nak;

  if (ack) return ACK.from(buffer);
  if (nak) return NACK.from(buffer);
  return Datagram.from(buffer);
}

function insert(array: any[], i: number, value: any) {
  return array.splice(i, 0, value);
}

export interface SplitMemory {
  id: number;
  packets: EncapsulatedPacket[];
}

export type SessionEvent =
  | "state"
  | "data"
  | "packet"
  | "bedrock";

export type SessionState =
  | "offline"
  | "open"
  | "accepted"
  | "handshake";

export class Session extends EventEmitter<SessionEvent> {
  time = 0;
  _state: SessionState = "offline";
  _mtuSize = 1492;
  _splits = new Array<SplitMemory>(4);
  _splitID = 0;
  _indexID = 0;

  constructor(
    public address: Address,
    public target: Address,
    readonly listener: Listener,
  ) {
    super();

    this.on(["data"], this.ondata.bind(this));
    this.on(["packet"], this.onpacket.bind(this));
    this.on(["bedrock"], this.onbedrock.bind(this));
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this.emit("state", value);
    this._state = value;
  }

  disconnect() {
    this.state = "offline";
  }

  memoryOf(id: number): [number, SplitMemory] {
    let slot = this._splits.findIndex((m) => m?.id === id);
    if (slot !== -1) return [slot, this._splits[slot]];

    slot = this._splits.findIndex((m) => !m);
    if (slot === -1) throw Error("Too many split packets");

    const memory = { id, packets: [] };
    this._splits[slot] = memory;
    return [slot, memory];
  }

  unsplit(packet: EncapsulatedPacket) {
    const { split } = packet;
    if (!split) return packet;

    if (!inRange(split.count, [0, 127])) {
      throw Error("Invalid split count");
    }

    if (!inRange(split.index, [0, split.count - 1])) {
      throw Error("Invalid split index");
    }

    const [slot, { packets }] = this.memoryOf(split.id);

    insert(packets, split.index, packet);
    if (packets.length !== split.count) return;

    const { reliability, index, order } = packet;

    const buffer = Buffer.empty(0);
    for (const packet of packets) {
      buffer.expand(packet.sub.length);
      buffer.writeArray(packet.sub);
    }

    const final = new EncapsulatedPacket(
      reliability,
      buffer.array,
      index,
      undefined,
      order,
    );

    delete this._splits[slot];
    return final;
  }

  private async ondata([data]: [Uint8Array], from: Origin) {
    if (!data) return;
    const buffer = new Buffer(data);

    if (this.state === "offline") {
      if (buffer.header === OfflinePong.id) {
        const pong = OfflinePong.from(buffer);
        pong.infos.name = "Proxied server";
        return [[await pong.export()]];
      }

      if (buffer.header === Open2Request.id) {
        const request = Open2Request.from(buffer);
        this._mtuSize = Math.min(request.mtuSize, this._mtuSize);
      }

      if (buffer.header === Open2Reply.id) {
        this.state = "open";
      }
    } else {
      console.log("datagram");
      const datagram = datagramOf(buffer);
      if (!(datagram instanceof Datagram)) return;
      const { headerFlags, seqNumber } = datagram;

      const datagrams: Datagram[] = [];

      for (const packet of datagram.packets) {
        const result = await this.emit("packet", [packet], from);
        if (result === "cancelled") continue;
        const [packets] = result as [EncapsulatedPacket[]];

        for (const packet of packets) {
          const datagram = new Datagram(headerFlags, seqNumber, [packet]);
          datagrams.push(datagram);
        }
      }

      if (!datagrams.length) return "cancelled";
      const exports = datagrams.map((it) => it.export());
      const buffers = await Promise.all(exports);
      return [buffers];
    }
  }

  private async onpacket([packet]: [EncapsulatedPacket], from: Origin) {
    if (!packet) return;

    if (packet.split) {
      console.log("split");
      const unsplit = this.unsplit(packet);
      if (!unsplit) return "cancelled";
      packet = unsplit;
      console.log("finished");
    }

    const buffer = new Buffer(packet.sub);
    console.log(origin(from), "packet", buffer.header);

    const { clientKey, serverKey } = this;
    const key = from === "server" ? serverKey : clientKey;
    const Batch = BatchPacket(key);

    if (buffer.header === ConnectionRequestAccepted.id) {
      this.state = "accepted";
    }

    if (buffer.header === DisconnectNotification.id) {
      this.state = "offline";
    }

    if (buffer.header === Batch.id) {
      console.log(buffer.array);
      const batch = await Batch.from(buffer);

      const { reliability, order, sequence, index } = packet;
      const packets: EncapsulatedPacket[] = [];

      for (const data of batch.packets) {
        const result = await this.emit("bedrock", data, from);
        if (result === "cancelled") continue;
        const [modified] = result as [Uint8Array];

        const length = packet.sub.length;
        const maxSize = this._mtuSize - 60;

        const buffers = [];
        const quotient = Math.floor(length / maxSize);
        const remainder = length % maxSize;

        const buffer = new Buffer(modified);
        for (let i = 0; i <= quotient; i++) {
          const size = i === quotient ? remainder : maxSize;
          buffers.push(buffer.readArray(size));
        }

        const count = buffers.length;
        const id = this._splitID % 65536;
        let i = 0;

        for (const buffer of buffers) {
          const packet = new EncapsulatedPacket(
            reliability,
            buffer,
            index,
            sequence,
            order,
            { count, id, index: i++ },
          );

          packets.push(packet);
        }
      }

      return [packets];
    }
  }

  keyPair?: KeyPair;
  serverKey?: Uint8Array;
  clientKey?: Uint8Array;

  private async onbedrock(data: Uint8Array, from: Origin) {
    const buffer = new Buffer(data);
    console.log(origin(from), "mcpe", buffer.header);

    if (buffer.header === ServerToClientHandshakePacket.id) {
      console.log("handshake");

      const handshake = ServerToClientHandshakePacket.from(buffer);

      const { jwt } = handshake;
      const keyPair = await node.gen();

      const dh: DiffieHellman = {
        publicKey: jwt.header.x5u,
        privateKey: keyPair.privateKey,
        salt: jwt.payload.salt,
      };

      this.serverKey = await node.key(dh);
      this.keyPair = keyPair;

      handshake.jwt.header.x5u = keyPair.publicKey;
      //data = await handshake.export();

      this.state = "handshake";
    }

    if (buffer.header === LoginPacket.id) {
      const login = LoginPacket.from(buffer);
      console.log(`${login.name} logged in!!!`);
    }

    return [data];
  }
}
