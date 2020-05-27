import { Session } from "./session.ts";
import { EventEmitter } from "./mod.ts";

export type Listener = Deno.DatagramConn;
export type Origin = "client" | "server";

export interface Address {
  hostname: string;
  port: number;
}

function listen(port: number) {
  const listener = Deno.listenDatagram({ port, transport: "udp" });
  (listener as any)["bufSize"] = 2048;
  return listener;
}

function tryListen(port: number): Listener {
  try {
    return listen(port);
  } catch (e) {
    if (port === 65535) throw e;
    return tryListen(port + 1);
  }
}

function send(proxy: Listener, data: Uint8Array, address: Address) {
  return proxy.send(data, { ...address, transport: "udp" });
}

export class Handler extends EventEmitter<"error" | "data" | "packet"> {
  public timeout = 5000;

  readonly listener: Listener;
  readonly sessions = new Map<string, Session>();

  constructor(
    readonly port: number,
    public target: Address,
  ) {
    super();

    this.listener = listen(port);

    this.listen();
    this.taskFree();
  }

  public sessionOf(address: Address) {
    const { hostname, port } = address;
    const name = `${hostname}:${port}`;

    const got = this.sessions.get(name);
    if (got) return got;

    const proxy = tryListen(50139);
    const session = new Session(address, this.target, proxy);

    session.on(["data"], (data, from) => {
      return this.emit("data", data, session, from);
    });

    session.on(["packet"], (packet, from) => {
      return this.emit("packet", packet, session, from);
    });

    this.sessions.set(name, session);
    this.redirect(session);

    return session;
  }

  private async listen() {
    try {
      for await (const [data, from] of this.listener) {
        try {
          const client = from as Address;

          const local = client.hostname === "127.0.0.1";
          if (local && client.port === this.port) continue;

          const session = this.sessionOf(client);
          session.time = Date.now();

          const result = await session.emit("data", data, "client");
          if (result === "cancelled") continue;
          const [modified] = result as [Uint8Array];
          send(session.listener, modified, session.target);
        } catch (e) {
          this.emit("error", e);
        }
      }
    } catch (e) {
      this.emit("error", e);
    }
  }

  private async redirect(session: Session) {
    try {
      for await (const [data, from] of session.listener) {
        try {
          const result = await session.emit("data", data, "server");
          if (result === "cancelled") continue;
          const [modified] = result as [Uint8Array];
          send(this.listener, modified, session.address);
        } catch (e) {
          this.emit("error", e);
        }
      }
    } catch (e) {
      this.emit("error", e);
    }
  }

  private taskFree() {
    const i = setInterval(this.free.bind(this), 5000);
    return () => clearInterval(i);
  }

  public async free() {
    for (const [name, session] of this.sessions.entries()) {
      if (Date.now() - session.time < this.timeout) continue;
      session.state = "offline";
      session.listener.close();
      this.sessions.delete(name);
    }
  }
}
