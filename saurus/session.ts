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
  AcknowledgePacket,
  isReliable,
  BedrockPacket,
  datagramOf,
} from "./protocol/mod.ts";

import {
  EventEmitter,
  inRange,
  node,
  DiffieHellman,
  encode,
  decode,
  KeyPair,
  Handler,
} from "./mod.ts";
import { Address, Listener, Origin, origin } from "./handler.ts";

function insert(array: any[], i: number, value: any) {
  return array.splice(i, 0, value);
}

export interface SplitMemory {
  id: number;
  packets: EncapsulatedPacket[];
}

export type SessionEvent =
  | "state"
  | "input"
  | "output";

export type DataType =
  | Uint8Array
  | Datagram
  | EncapsulatedPacket
  | BedrockPacket;

export const Offline = 0;
export const Open = 1;
export const Accepted = 2;
export const Encrypted = 3;

export type SessionState =
  | typeof Offline
  | typeof Open
  | typeof Accepted
  | typeof Encrypted;

export function opposite(origin: Origin): Origin {
  return origin === "client" ? "server" : "client";
}

export class Session extends EventEmitter<SessionEvent> {
  time = 0;

  _state: SessionState = Offline;
  _mtuSize = 1492;

  _serverSplits = new Array<SplitMemory>(4);
  _clientSplits = new Array<SplitMemory>(4);

  _serverSplitID = 0;
  _clientSplitID = 0;

  _serverPacketIndex = 0;
  _clientPacketIndex = 0;

  _serverSeqNumber = 0;
  _clientSeqNumber = 0;

  constructor(
    public client: Address,
    public server: Address,
    readonly listener: Listener,
    readonly handler: Handler,
  ) {
    super();
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this.emit("state", value);
    this._state = value;
  }

  disconnect() {
    this.state = Offline;
  }

  memoryOf(splits: SplitMemory[], id: number): [number, SplitMemory] {
    let slot = splits.findIndex((m) => m?.id === id);
    if (slot !== -1) return [slot, splits[slot]];

    slot = splits.findIndex((m) => !m);
    if (slot === -1) throw Error("Too many split packets");

    const memory = { id, packets: [] };
    splits[slot] = memory;
    return [slot, memory];
  }

  async handle(data: Uint8Array, from: Origin) {
    const result = await this.emit("input", data, from);
    if (result === "cancelled") return;
    [data, from] = result;

    if (!data || !from) return;

    if (this.state > Offline) {
      await this.handleOnline(data, from);
    } else {
      await this.handleOffline(data, from);
    }
  }

  async send(data: Uint8Array, to: Origin) {
    const result = await this.emit("output", data, to);
    if (result === "cancelled") return;
    [data, to] = result;

    if (!data || !to) return;

    if (to === "client") {
      const listener = this.handler.listener;
      const address = this.client;
      await listener.send(data, { ...address, transport: "udp" });
    } else {
      const listener = this.listener;
      const address = this.server;
      await listener.send(data, { ...address, transport: "udp" });
    }
  }

  async handleOffline(data: Uint8Array, from: Origin) {
    const buffer = new Buffer(data);

    if (buffer.header === OfflinePong.id) {
      const pong = OfflinePong.from(buffer);
      pong.infos.name = "Proxied server";
      data = await pong.export();
    }

    if (buffer.header === Open2Request.id) {
      const request = Open2Request.from(buffer);
      this._mtuSize = Math.min(request.mtuSize, this._mtuSize);
    }

    if (buffer.header === Open2Reply.id) {
      this.state = Open;
    }

    await this.send(data, opposite(from));
  }

  async handleOnline(data: Uint8Array, from: Origin) {
    const datagram = datagramOf(data);
    if (!datagram) return;

    if (datagram instanceof Datagram) {
      await this.handleDatagram(datagram, from);
    } else {
      await this.handleAck(datagram, from);
    }
  }

  async handleAck(ack: ACK | NACK, from: Origin) {
    const result = await this.emit("input", ack, from);
    if (result === "cancelled") return;
    [ack, from] = result;

    if (!ack || !from) return;

    if (ack instanceof NACK) {
      console.log(origin(from), "NACK");
    }

    // await this.sendAck(ack, opposite(from));
  }

  async sendAck(ack: ACK | NACK, to: Origin) {
    const result = await this.emit("output", ack, to);
    if (result === "cancelled") return;
    [ack, to] = result;

    if (!ack || !to) return;

    const data = await ack.export();
    await this.send(data, to);
  }

  async handleDatagram(datagram: Datagram, from: Origin) {
    const result = await this.emit("input", datagram, from);
    if (result === "cancelled") return;
    [datagram, from] = result;

    if (!datagram || !from) return;

    const ack = new ACK([datagram.seqNumber]);
    await this.sendAck(ack, from);

    for (const packet of datagram.packets) {
      await this.handlePacket(packet, from);
    }

    // await this.sendDatagram(datagram, opposite(from));
  }

  async sendDatagram(datagram: Datagram, to: Origin) {
    const result = await this.emit("output", datagram, to);
    if (result === "cancelled") return;
    [datagram, to] = result;

    if (!datagram || !to) return;

    const data = await datagram.export();
    await this.send(data, to);
  }

  async handlePacket(packet: EncapsulatedPacket, from: Origin) {
    if (packet.split) {
      const { split } = packet;
      const { id, index, count } = split;

      const splits = from === "client"
        ? this._clientSplits
        : this._serverSplits;

      const [slot, { packets }] = this.memoryOf(splits, id);

      if (packets[index]) return;
      insert(packets, index, packet);
      if (packets.length !== count) return;

      const buffer = Buffer.empty(0);
      for (const packet of packets) {
        buffer.expand(packet.sub.length);
        buffer.writeArray(packet.sub);
      }

      packet.sub = buffer.array;
      delete packet.split;
      delete splits[slot];
    }

    if (this.state < Encrypted) {
      const buffer = new Buffer(packet.sub);

      if (buffer.header === BatchPacket().id) {
        const batch = await BatchPacket().from(buffer);

        const packets = [];
        for (const bedrock of batch.packets) {
          const id = new Buffer(bedrock).readUVInt();

          if (id === ServerToClientHandshakePacket.id) {
            this.state = Encrypted;
          }

          if (id === LoginPacket.id) {
            const buffer = new Buffer(bedrock);
            const login = LoginPacket.from(buffer);
            console.log("Logged in", login);
            packets.push(await login.export());
            continue;
          }

          packets.push(bedrock);
        }

        batch.packets = packets;
        //packet.sub = await batch.export();
        //console.log("export", packet.sub.length);
      }
    }

    await this.sendPacket(packet, opposite(from));
  }

  async sendPacket(packet: EncapsulatedPacket, to: Origin) {
    const length = packet.sub.length;
    const maxSize = this._mtuSize - 60;
    const quotient = Math.floor(length / maxSize);
    const remainder = length % maxSize;

    const buffer = new Buffer(packet.sub);
    const buffers = [];

    for (let i = 0; i <= quotient; i++) {
      const size = i === quotient ? remainder : maxSize;
      buffers.push(buffer.readArray(size));
    }

    let split = undefined;

    if (buffers.length > 1) {
      const splitID = to === "client"
        ? this._clientSplitID++
        : this._serverSplitID++;

      split = {
        count: buffers.length,
        id: splitID % 65536,
        index: 0,
      };
    }

    const { reliability, sequence, order } = packet;

    for (const [i, sub] of buffers.entries()) {
      if (split) split.index = i;

      const index = to === "client"
        ? this._clientPacketIndex++
        : this._serverPacketIndex++;

      const packet = new EncapsulatedPacket({
        reliability,
        sub,
        index,
        sequence,
        order,
        split,
      });

      const seqNumber = to === "client"
        ? this._clientSeqNumber++
        : this._serverSeqNumber++;

      const datagram = new Datagram(Datagram.flag_valid, seqNumber, [packet]);
      await this.sendDatagram(datagram, to);
    }
  }

  // keyPair?: KeyPair;
  // serverKey?: Uint8Array;
  // clientKey?: Uint8Array;

  // private async onbedrock(data: Uint8Array, from: Origin) {
  //   const buffer = new Buffer(data);
  //   console.log(origin(from), "mcpe", buffer.header);

  //   if (buffer.header === ServerToClientHandshakePacket.id) {
  //     console.log("handshake");

  //     const handshake = ServerToClientHandshakePacket.from(buffer);

  //     const { jwt } = handshake;
  //     const keyPair = await node.gen();

  //     const dh: DiffieHellman = {
  //       publicKey: jwt.header.x5u,
  //       privateKey: keyPair.privateKey,
  //       salt: jwt.payload.salt,
  //     };

  //     this.serverKey = await node.key(dh);
  //     this.keyPair = keyPair;

  //     handshake.jwt.header.x5u = keyPair.publicKey;
  //     //data = await handshake.export();

  //     this.state = "handshake";
  //   }

  //   if (buffer.header === LoginPacket.id) {
  //     const login = LoginPacket.from(buffer);
  //     console.log(`${login.name} logged in!!!`);
  //   }

  //   return [data];
  // }
}
