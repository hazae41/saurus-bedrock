import { Address, Listener, Origin, origin } from "./handler.ts";
import {
  diffieHellman,
  EventEmitter,
  genKeyPair,
  genSalt,
  Handler,
  KeyPair,
} from "./mod.ts";
import {
  ACK,
  AcknowledgePacket,
  BatchPacket,
  BedrockPacket,
  Buffer,
  Datagram,
  datagramOf,
  EncapsulatedPacket,
  isReliable,
  LoginPacket,
  NACK,
  Open2Reply,
  Open2Request,
  ProtocolPacket,
  ServerHandshakePacket,
} from "./protocol/mod.ts";
import { fromB64 } from "./saurus.ts";
import { Aes256Cfb8 } from "./wasm.ts";
import {
  ResourcePackResponse,
  ResourcePackStatus,
} from "./protocol/bedrock/resourcepacks.ts";

function insert(array: any[], i: number, value: any) {
  return array.splice(i, 0, value);
}

export interface SplitMemory {
  id: number;
  packets: EncapsulatedPacket[];
}

export type SessionEvent =
  | "state"
  | "data-in"
  | "data-out"
  | "packet-in"
  | "packet-out"
  | "bedrock-in"
  | "bedrock-out";

export type DataType =
  | Uint8Array
  | Datagram
  | EncapsulatedPacket
  | BedrockPacket;

export enum SessionState {
  Offline = 0,
  Online = 1,
  Encrypted = 2,
}

export function opposite(origin: Origin): Origin {
  return origin === "client" ? "server" : "client";
}

export function inRange(n: number, [start, end]: number[]) {
  return n >= start && n <= end;
}

export class Session extends EventEmitter<SessionEvent> {
  time = 0;

  _state = SessionState.Offline;
  _mtuSize = 1492;

  _serverSplits = new Array<SplitMemory>(4);
  _clientSplits = new Array<SplitMemory>(4);

  _serverSplitID = 0;
  _clientSplitID = 0;

  _serverPacketIndex = 0;
  _clientPacketIndex = 0;

  _clientReliableWindow = { start: 0, end: 2048 };
  _serverReliableWindow = { start: 0, end: 2048 };

  _clientPacketIndexes = new Set<number>();
  _serverPacketIndexes = new Set<number>();

  _serverSeqNumber = 0;
  _clientSeqNumber = 0;

  _keyPair?: KeyPair;
  _salt = "";

  _clientSecret = "";
  _serverSecret = "";

  _clientEncryptor?: Aes256Cfb8;
  _clientDecryptor?: Aes256Cfb8;

  _serverEncryptor?: Aes256Cfb8;
  _serverDecryptor?: Aes256Cfb8;

  _clientSendCounter = { x: 0 };
  _serverSendCounter = { x: 0 };

  _clientReceiveCounter = { x: 0 };
  _serverReceiveCounter = { x: 0 };

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
    this.state = SessionState.Offline;
    this.listener.close();
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
    const result = await this.emit("data-in", data, from);
    if (result === "cancelled") return;
    [data, from] = result;

    if (!data || !from) return;

    if (this.state === SessionState.Offline) {
      await this.handleOffline(data, from);
    } else {
      await this.handleOnline(data, from);
    }
  }

  async send(data: Uint8Array, to: Origin) {
    const result = await this.emit("data-out", data, to);
    if (result === "cancelled") return;
    [data, to] = result;

    if (!data || !to) throw new Error("Event error");

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
    const id = ProtocolPacket.header(buffer);

    if (id === Open2Request.id) {
      const request = Open2Request.from(buffer);
      this._mtuSize = Math.min(request.mtuSize, this._mtuSize);
    }

    if (id === Open2Reply.id) {
      this.state = SessionState.Online;
    }

    await this.send(data, opposite(from));
  }

  async handleOnline(data: Uint8Array, from: Origin) {
    const datagram = datagramOf(data);

    if (datagram instanceof Datagram) {
      await this.handleDatagram(datagram, from);
    }

    if (datagram instanceof AcknowledgePacket) {
      await this.handleAck(datagram, from);
    }
  }

  async handleAck(ack: ACK | NACK, from: Origin) {
    if (ack instanceof NACK) {
      console.log(origin(from), "NACK");
    }
  }

  async sendAck(ack: ACK | NACK, to: Origin) {
    const data = await ack.export();
    await this.send(data, to);
  }

  async handleDatagram(datagram: Datagram, from: Origin) {
    const ack = new ACK([datagram.seqNumber]);
    await this.sendAck(ack, from);

    for (const packet of datagram.packets) {
      await this.handlePacket(packet, from);
    }
  }

  async sendDatagram(datagram: Datagram, to: Origin) {
    const data = await datagram.export();
    await this.send(data, to);
  }

  async handlePacket(packet: EncapsulatedPacket, from: Origin) {
    if (isReliable(packet.reliability)) {
      const { index } = packet;
      if (index === undefined) throw Error("No index");

      const window = from === "client"
        ? this._clientReliableWindow
        : this._serverReliableWindow;

      const indexes = from === "client"
        ? this._clientPacketIndexes
        : this._serverPacketIndexes;

      const { start, end } = window;

      if (!inRange(index, [start, end])) return;

      if (indexes.has(index)) {
        throw Error("Duplicate packet index");
      }

      indexes.add(index);

      if (index === start) {
        while (indexes.has(start)) {
          indexes.delete(start);
          window.start++;
          window.end++;
        }
      }
    }

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

    const buffer = new Buffer(packet.sub);
    const id = ProtocolPacket.header(buffer);

    if (id === BatchPacket().id) {
      packet.sub = await this.handleBatch(buffer, from);
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

  async handleBatch(buffer: Buffer, from: Origin) {
    if (this.state === SessionState.Encrypted) {
      return await this.handleEncryptedBatch(buffer, from);
    } else {
      return await this.handleUnencryptedBatch(buffer, from);
    }
  }

  async handleUnencryptedBatch(buffer: Buffer, from: Origin) {
    const Batch = BatchPacket();
    const batch = await Batch.from(buffer);
    const packets: Uint8Array[] = [];

    for (const data of batch.packets) {
      packets.push(await this.handleBedrock(data, from));
    }

    return await new Batch(...packets).export();
  }

  async handleEncryptedBatch(buffer: Buffer, from: Origin) {
    const receiveCounter = from === "client"
      ? this._clientReceiveCounter
      : this._serverReceiveCounter;

    const sendCounter = from === "client"
      ? this._serverSendCounter
      : this._clientSendCounter;

    const receiveSecret = from === "client"
      ? this._clientSecret
      : this._serverSecret;

    const sendSecret = from === "client"
      ? this._serverSecret
      : this._clientSecret;

    const decryptor = from === "client"
      ? this._clientDecryptor
      : this._serverDecryptor;

    const encryptor = from === "client"
      ? this._serverEncryptor
      : this._clientEncryptor;

    const ReceiveBatch = BatchPacket({
      secret: receiveSecret,
      counter: receiveCounter,
      decryptor,
    });

    const SendBatch = BatchPacket({
      secret: sendSecret,
      counter: sendCounter,
      encryptor,
    });

    console.log(origin(from), "batch");
    const batch = await ReceiveBatch.from(buffer);

    const packets: Uint8Array[] = [];

    for (const data of batch.packets) {
      packets.push(await this.handleBedrock(data, from));
    }

    return await new SendBatch(...packets).export();
  }

  async handleBedrock(data: Uint8Array, from: Origin) {
    const buffer = new Buffer(data);
    const id = BedrockPacket.header(buffer);
    console.log(origin(from), "bedrock", id);

    if (from === "client") {
      if (id === LoginPacket.id) {
        data = await this.handleLoginPacket(buffer);
      }

      if (id === ResourcePackResponse.id) {
        const packet = ResourcePackResponse.from(buffer);
        console.log(ResourcePackStatus[packet.status]);
      }
    }

    if (from === "server") {
      if (id === ServerHandshakePacket.id) {
        data = await this.handleHandshakePacket(buffer);
      }
    }

    return data;
  }

  async handleHandshakePacket(buffer: Buffer) {
    const handshake = ServerHandshakePacket.from(buffer);

    const keyPair = this._keyPair!!;
    const privateKey = keyPair.privateKey;
    const publicKey = handshake.token.header.x5u;
    const salt = handshake.token.payload.salt;

    const secret = await diffieHellman({ privateKey, publicKey, salt });

    const bsecret = fromB64(secret);
    const iv = bsecret.slice(0, 16);

    this._serverSecret = secret;

    this._serverEncryptor = new Aes256Cfb8(bsecret, iv);
    this._serverDecryptor = new Aes256Cfb8(bsecret, iv);

    handshake.token.payload.salt = this._salt;
    await handshake.token.sign(keyPair);

    this.state = SessionState.Encrypted;

    return await handshake.export();
  }

  async handleLoginPacket(buffer: Buffer) {
    const login = LoginPacket.from(buffer);

    const last = login.tokens[login.tokens.length - 1];

    const keyPair = await genKeyPair();
    const salt = await genSalt();

    this._keyPair = keyPair;
    this._salt = salt;

    const privateKey = keyPair.privateKey;
    const publicKey = last.payload.identityPublicKey;

    const secret = await diffieHellman({ privateKey, publicKey, salt });

    const bsecret = fromB64(secret);
    const iv = bsecret.slice(0, 16);

    this._clientSecret = secret;

    this._clientEncryptor = new Aes256Cfb8(bsecret, iv);
    this._clientDecryptor = new Aes256Cfb8(bsecret, iv);

    last.payload.identityPublicKey = keyPair.publicKey;

    await last.sign(keyPair);
    await login.client.sign(keyPair);

    return await login.export();
  }
}
