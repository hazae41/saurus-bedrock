import { VersionedAddress, Packet } from "./packets.ts";
import { decode, encode } from "../mod.ts";

export const magic = [
  0x00,
  0xFF,
  0xFF,
  0x00,
  0xFE,
  0xFE,
  0xFE,
  0xFE,
  0xFD,
  0xFD,
  0xFD,
  0xFD,
  0x12,
  0x34,
  0x56,
  0x78,
];

export function isMagic(array: Uint8Array) {
  return array.toString() === magic.toString();
}

export class Buffer {
  constructor(
    public array: Uint8Array,
    public offset = 0,
  ) {}

  static empty(length?: number) {
    const buffer = new ArrayBuffer(length ?? 0);
    return new this(new Uint8Array(buffer));
  }

  get view() {
    return new DataView(this.array.buffer);
  }

  get header() {
    return this.view.getUint8(0);
  }

  get length() {
    return this.array.length;
  }

  get remaining() {
    return this.length - this.offset;
  }

  export(): Uint8Array {
    return this.array.slice(0, this.offset);
  }

  expand(length: number) {
    if (length <= 0) return;
    const total = this.length + length;
    const next = new Uint8Array(total);
    next.set(this.array, 0);
    this.array = next;
  }

  merge(other: Buffer) {
    const length = this.length + other.length;
    const buffer = Buffer.empty(length);
    buffer.writeArray(this.array);
    buffer.writeArray(other.array);
    return buffer;
  }

  off(x: number) {
    const offset = (this.offset += x) - x;
    this.expand(this.offset - this.length);
    return offset;
  }

  readByte(): number {
    const offset = this.off(1);
    return this.view.getUint8(offset);
  }

  writeByte(x: number) {
    const offset = this.off(1);
    this.view.setUint8(offset, x);
  }

  writeBool(x: boolean) {
    this.writeByte(x ? 1 : 0);
  }

  readBool(): boolean {
    return this.readByte() !== 0;
  }

  readShort(): number {
    const offset = this.off(2);
    return this.view.getUint16(offset);
  }

  writeShort(x: number) {
    const offset = this.off(2);
    this.view.setUint16(offset, x);
  }

  readLShort(): number {
    const offset = this.off(2);
    return this.view.getUint16(offset, true);
  }

  writeLShort(x: number) {
    const offset = this.off(2);
    this.view.setUint16(offset, x, true);
  }

  readInt(): number {
    const offset = this.off(4);
    return this.view.getInt32(offset);
  }

  writeInt(x: number) {
    const offset = this.off(4);
    this.view.setInt32(offset, x);
  }

  readUInt(): number {
    const offset = this.off(4);
    return this.view.getUint32(offset);
  }

  writeUInt(x: number) {
    const offset = this.off(4);
    this.view.setUint32(offset, x);
  }

  readLInt(): number {
    const offset = this.off(4);
    return this.view.getInt32(offset, true);
  }

  writeLInt(x: number) {
    const offset = this.off(4);
    this.view.setInt32(offset, x, true);
  }

  readLUInt(): number {
    const offset = this.off(4);
    return this.view.getUint32(offset, true);
  }

  writeLUInt(x: number) {
    const offset = this.off(4);
    this.view.setUint32(offset, x, true);
  }

  readLong(): number {
    const int1 = this.readUInt();
    const int2 = this.readUInt();
    return (int1 << 8) + int2;
  }

  writeLong(x: number) {
    let max = 0xFFFFFFFF;
    this.writeUInt(~~(x / max));
    this.writeUInt(x & max);
  }

  readLLong(): number {
    const int1 = this.readLUInt();
    const int2 = this.readLUInt();
    return int1 + (int2 << 8);
  }

  writeLLong(x: number) {
    let max = 0xFFFFFFFF;
    this.writeLUInt(x & max);
    this.writeLUInt(~~(x / max));
  }

  readLTriad(): number {
    const b1 = this.readByte();
    const b2 = this.readByte();
    const b3 = this.readByte();
    return b1 + b2 * 2 ** 8 + b3 * 2 ** 16;
  }

  writeLTriad(x: number) {
    this.writeByte(x);
    this.writeByte(x >>> 8);
    this.writeByte((x >>> 8) >>> 8);
  }

  readArray(size: number): Uint8Array {
    const offset = this.off(size);
    const buffer = this.view.buffer;
    const sub = buffer.slice(offset, this.offset);
    return new Uint8Array(sub);
  }

  writeArray(array: Uint8Array) {
    const offset = this.off(array.length);
    this.array.set(array, offset);
    return this;
  }

  readUVIntArray(): Uint8Array {
    const size = this.readUVInt();
    return this.readArray(size);
  }

  writeUVIntArray(array: Uint8Array) {
    this.writeUVInt(array.length);
    this.writeArray(array);
  }

  readMagic(): Uint8Array {
    return this.readArray(16);
  }

  checkMagic() {
    const magic = this.readMagic();
    if (isMagic(magic)) return;
    throw new Error("Could not read magic");
  }

  writeMagic() {
    this.writeArray(new Uint8Array(magic));
  }

  readString(size: number): string {
    const array = this.readArray(size);
    return decode(array);
  }

  writeString(s: string) {
    const array = encode(s);
    this.writeArray(array);
  }

  readShortString(): string {
    return this.readString(this.readShort());
  }

  writeShortString(s: string) {
    this.writeShort(s.length);
    this.writeString(s);
  }

  readUVIntString(): string {
    const size = this.readUVInt();
    return this.readString(size);
  }

  writeUVIntString(s: string) {
    this.writeUVInt(s.length);
    this.writeString(s);
  }

  readLIntString(): string {
    const size = this.readLInt();
    return this.readString(size);
  }

  writeLIntString(s: string) {
    this.writeLInt(s.length);
    this.writeString(s);
  }

  readAddress(): VersionedAddress {
    const version = this.readByte();
    if (version === 4) {
      const parts = [];
      for (let i = 0; i < 4; i++) parts.push((~this.readByte()) & 0xFF);
      const hostname = parts.join(".");
      const port = this.readShort();
      return { hostname, port, version };
    }
    if (version === 6) {
      this.readLShort();
      const port = this.readShort();
      this.readInt();
      const array = this.readArray(16);
      const decoder = new TextDecoder("utf-8");
      const hostname = decoder.decode(array);
      this.readInt();
      return { hostname, port, version };
    }
    throw Error(`Unknown version ${version}`);
  }

  writeAddress(x: VersionedAddress) {
    const { hostname, port, version } = x;
    if (version === 4) {
      this.writeByte(version);
      const parts = hostname.split(".").map(Number);
      if (parts.length !== 4) throw Error("Wrong number of parts");
      const write = this.writeByte.bind(this);
      parts.map((part) => ~(part) & 0xff).forEach(write);
      this.writeShort(port);
      return;
    }
    if (version === 6) {
      this.writeByte(version);
      this.writeLShort(10);
      this.writeShort(port);
      this.writeInt(0);
      const encoder = new TextEncoder();
      const array = encoder.encode(hostname);
      this.writeArray(array);
      this.writeInt(0);
      return;
    }
    throw Error(`Unknown version ${version}`);
  }

  readUVInt(): number {
    let x = 0;
    for (let i = 0; i < 64; i += 7) {
      const b = this.readByte();
      x |= (b & 0x7f) << i;
      if ((b & 0x80) === 0) return x;
    }

    throw Error("UVInt did not terminate");
  }

  writeUVInt(x: number) {
    while (true) {
      if ((x & ~0x7f) === 0) {
        this.writeByte(x);
        return;
      }

      this.writeByte((x & 0x7f) | 0x80);
      x >>>= 7;
    }
  }
}
