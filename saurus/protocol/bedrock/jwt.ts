import {
  encode as btoa,
  decode as atob,
} from "https://deno.land/std/encoding/base64url.ts";
import { decode } from "../../mod.ts";

export class JWT {
  public header: any;
  public rawPayload: string;
  public payload: any;
  public signature: string;

  constructor(
    jwt: string,
    public keepPayload = false,
    public headerEndsWithO = false,
    public payloadEndsWithCg = false,
  ) {
    const { parse } = JSON;
    const [header, payload, signature] = jwt.split(".");

    const theader = decode(new Uint8Array(atob(header)));
    this.header = parse(theader.replace(/\\\//g, "$/"));

    this.rawPayload = payload;
    if (!this.keepPayload) console.log(payload);

    const tpayload = decode(new Uint8Array(atob(payload)));
    this.payload = parse(tpayload.replace(/\\\//g, "$/"));

    this.signature = signature;
  }

  export() {
    const { stringify } = JSON;

    let header = btoa(stringify(this.header).replace(/\$\//g, "\\/"));
    if (this.headerEndsWithO) header += "o";

    let payload = this.rawPayload;

    if (!this.keepPayload) {
      payload = btoa(stringify(this.payload).replace(/\$\//g, "\\/"));
      if (this.payloadEndsWithCg) payload += "Cg";
      console.log(payload);
    }

    const signature = this.signature;
    return [header, payload, signature].join(".");
  }
}
