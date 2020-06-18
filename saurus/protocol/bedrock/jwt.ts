import {
  encode as btoa,
  decode as atob,
} from "https://deno.land/std/encoding/base64url.ts";
import { decode, KeyPair, sign, encode } from "../../mod.ts";

export const toB64url = (raw: Uint8Array | string) => btoa(raw);
export const fromB64url = (text: string) => decode(new Uint8Array(atob(text)));

export class JWT {
  public header: any;
  public payload: any;
  public signature: string;

  constructor(public token: string) {
    const { parse } = JSON;

    const [header, payload, signature] = token.split(".");

    this.header = parse(fromB64url(header));
    this.payload = parse(fromB64url(payload));
    this.signature = signature;
  }

  async sign(keyPair: KeyPair) {
    const { stringify } = JSON;
    const data = encode(stringify(this.payload));
    this.token = await sign(keyPair, data);
  }
}
