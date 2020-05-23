import { EventEmitter } from "./events.ts";
import { Session } from "./session.ts";

export type Listener = Deno.DatagramConn;

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
  readonly listener: Listener;
  readonly sessions = new Map<string, Session>();

  constructor(readonly port: number, readonly target: Address) {
    super();
    this.listener = listen(port);
    this.listen();
  }

  sessionOf(address: Address) {
    const { hostname, port } = address;
    const name = `${hostname}:${port}`;

    const got = this.sessions.get(name);
    if (got) return got;

    const proxy = tryListen(50139);
    const session = new Session(address, proxy);

    session.on(["data"], (data, type) => {
      return this.emit("data", data, session, type);
    });

    session.on(["packet"], (packet, type) => {
      return this.emit("packet", packet, session, type);
    });

    this.sessions.set(name, session);
    this.redirect(session);

    return session;
  }

  async listen() {
    const { listener, target } = this;

    try {
      for await (const [data, from] of listener) {
        try {
          const client = from as Address;
          const session = this.sessionOf(client);

          const result = await session.emit("data", data, "input");
          if (result === "cancelled") continue;
          const [modified] = result as [Uint8Array];

          send(session.listener, modified, target);
        } catch (e) {
          this.emit("error", e);
        }
      }
    } catch (e) {
      this.emit("error", e);
    }
  }

  async redirect(session: Session) {
    const { listener, address } = session;

    try {
      for await (const [data, from] of listener) {
        try {
          const result = await session.emit("data", data, "output");
          if (result === "cancelled") continue;
          const [modified] = result as [Uint8Array];

          send(this.listener, modified, address);
        } catch (e) {
          this.emit("error", e);
        }
      }
    } catch (e) {
      this.emit("error", e);
    }
  }
}
