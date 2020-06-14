export class JWT {
  public header: any;
  public payload: any;
  public signature: string;

  constructor(jwt: string) {
    const { parse } = JSON;
    const [header, payload, signature] = jwt.split(".");
    this.header = parse(atob(header));
    this.payload = parse(atob(payload));
    this.signature = signature;
  }

  export() {
    const { stringify } = JSON;
    const header = stringify(btoa(this.header));
    const payload = stringify(btoa(this.payload));
    const signature = this.signature;
    return [header, payload, signature].join(".");
  }
}
