import { EventEmitter } from "./events.ts";
import { Address, Listener, Origin } from "./handler.ts";
import { Buffer } from "./protocol/buffer.ts";
import { BatchPacket } from "./protocol/bedrock/batch.ts";
import { Open2Reply } from "./protocol/offline/opening.ts";
import { OfflinePong } from "./protocol/offline/pings.ts";
import { ACK, NACK } from "./protocol/online/ack.ts";
import { Datagram } from "./protocol/online/datagram.ts";
import {
  EncapsulatedPacket,
  inRange,
} from "./protocol/online/encapsulation.ts";
import { LoginPacket } from "./protocol/bedrock/login.ts";
import {
  ConnectionRequestAccepted,
  DisconnectNotification,
} from "./protocol/online/connection.ts";
import { ServerToClientHandshakePacket } from "./protocol/bedrock/handshake.ts";

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

export class Session extends EventEmitter<SessionEvent> {
  time = 0;
  _state: "offline" | "open" | "accepted" | "handshake" = "offline";
  _splits = new Array<SplitMemory>(4);

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

    const final = new EncapsulatedPacket(reliability, buffer.array);
    Object.assign(final, { reliability, index, order });

    delete this._splits[slot];
    return final;
  }

  private async ondata(data: Uint8Array, from: Origin) {
    const buffer = new Buffer(data);

    if (this.state === "offline") {
      if (buffer.header === OfflinePong.id) {
        const pong = OfflinePong.from(buffer);
        pong.infos.name = "Proxied server";
        data = await pong.export();
      }

      if (buffer.header === Open2Reply.id) {
        this.state = "open";
      }
    }

    if (this.state !== "offline") {
      const datagram = datagramOf(buffer);
      if (!(datagram instanceof Datagram)) return;

      const packets = [];

      for (const packet of datagram.packets) {
        const result = await this.emit("packet", packet, from);
        if (result === "cancelled") continue;
        const [modified] = result as [EncapsulatedPacket];
        packets.push(modified);
      }

      datagram.packets = packets;
      data = await datagram.export();
    }

    return [data];
  }

  private async onpacket(packet: EncapsulatedPacket, from: Origin) {
    if (packet.split) return;
    const buffer = new Buffer(packet.sub);
    console.log("packet", buffer.header);

    if (buffer.header === ConnectionRequestAccepted.id) {
      this.state = "accepted";
    }

    if (buffer.header === DisconnectNotification.id) {
      this.state = "offline";
    }

    if (buffer.header === BatchPacket.id) {
      const batch = await BatchPacket.from(buffer);
      if (!batch.packets.length) return;

      const packets = [];

      for (const data of batch.packets) {
        const result = await this.emit("bedrock", data, from);
        if (result === "cancelled") continue;
        const [modified] = result;
        packets.push(modified);
      }

      batch.packets = packets;
      packet.sub = await batch.export();
    }
  }

  private async onbedrock(data: Uint8Array, from: Origin) {
    const buffer = new Buffer(data);
    console.log("mcpe", buffer.header);

    if (buffer.header === ServerToClientHandshakePacket.id) {
      console.log("handshake");
      const handshake = ServerToClientHandshakePacket.from(buffer);
      this.state = "handshake";
    }

    if (buffer.header === LoginPacket.id) {
      const login = LoginPacket.from(buffer);
      console.log(`${login.name} logged in!!!`);
    }

    return [data];
  }
}
