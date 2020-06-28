import { decode, KeyPair, sign, encode, fromB64url } from "../../mod.ts";

export class JWT {
  public header: any;
  public payload: any;
  public signature: string;

  constructor(public token: string) {
    const { parse } = JSON;

    const [header, payload, signature] = token.split(".");

    this.header = parse(decode(fromB64url(header)));
    this.payload = parse(decode(fromB64url(payload)));
    this.signature = signature;
  }

  async sign(keyPair: KeyPair) {
    const { stringify } = JSON;
    const data = encode(stringify(this.payload));
    this.token = await sign(keyPair, data);
  }
}
