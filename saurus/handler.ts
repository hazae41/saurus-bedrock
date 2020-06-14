import { Session } from "./session.ts";
import { EventEmitter, Offline } from "./mod.ts";

export type Listener = Deno.DatagramConn;
export type Origin = "client" | "server";

export interface Address {
  hostname: string;
  port: number;
}

export function origin(from: Origin) {
  if (from === "client") return "->";
  if (from === "server") return "<-";
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

export class Handler extends EventEmitter<"error" | "session"> {
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
    const session = new Session(address, this.target, proxy, this);
    this.sessions.set(name, session);
    this.redirect(session);

    this.emit("session", session);

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

          await session.handle(data, "client");
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
          // TODO: verify from
          await session.handle(data, "server");
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
      session.state = Offline;
      session.listener.close();
      this.sessions.delete(name);
    }
  }
}
