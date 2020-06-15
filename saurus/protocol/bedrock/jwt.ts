export class JWT {
  public header: any;
  public payload: any;
  public signature: string;

  constructor(jwt: string) {
    const { parse } = JSON;
    const [header, payload, signature] = jwt.split(".");
    console.log(header);
    this.header = parse(atob(header));
    this.payload = parse(atob(payload));
    this.signature = signature;
  }

  export() {
    const { stringify } = JSON;
    const header = btoa(stringify(this.header)).replace("==", "o");
    const payload = btoa(stringify(this.payload)).replace("==", "o");
    const signature = this.signature;
    console.log(header);
    return [header, payload, signature].join(".");
  }
}
