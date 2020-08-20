import { serve, serveTLS } from "https://deno.land/std@0.65.0/http/server.ts";

import {
  acceptWebSocket,
  WebSocket,
} from "https://deno.land/std@0.65.0/ws/mod.ts";

import { EventEmitter } from "https://deno.land/x/mutevents@1.0/mod.ts";

export class WSHandler extends EventEmitter<"accept" | "close"> {
  constructor(
    readonly port: number,
    readonly tls = false,
  ) {
    super();

    if (this.tls) {
      this.listenTLS();
    } else {
      this.listen();
    }
  }

  private async listen() {
    for await (const req of serve(`:${this.port}`)) {
      const { conn, r: bufReader, w: bufWriter, headers } = req;

      try {
        const socket = await acceptWebSocket({
          conn,
          bufReader,
          bufWriter,
          headers,
        });

        const connection = new WSConnection(socket);

        connection.on(["close"], () => this.emit("close", connection));

        this.emit("accept", connection);
      } catch (e) {
        await req.respond({ status: 400 });
      }
    }
  }

  private async listenTLS() {
    try {
      const { port } = this;
      const certFile = "./ssl.cert";
      const keyFile = "./ssl.key";
      const o = { port, certFile, keyFile };

      for await (const req of serveTLS(o)) {
        const { conn, r: bufReader, w: bufWriter, headers } = req;

        try {
          const socket = await acceptWebSocket({
            conn,
            bufReader,
            bufWriter,
            headers,
          });

          const connection = new WSConnection(socket);

          connection.on(["close"], () => this.emit("close", connection));

          this.emit("accept", connection);
        } catch (e) {
          console.error(e);
          await req.respond({ status: 400 });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export class WSConnection extends EventEmitter<"data" | "close"> {
  constructor(
    readonly socket: WebSocket,
  ) {
    super();
  }

  private async listen() {
    try {
      for await (const text of this.socket) {
        if (typeof text !== "string") continue;
        const data = JSON.parse(text);
        await this.emit("data", data);
      }
    } catch (e) {}

    await this.close();
  }

  async read() {
    try {
      for await (const text of this.socket) {
        if (typeof text !== "string") continue;
        const data = JSON.parse(text);
        return data;
      }
    } catch (e) {}

    await this.close();
  }

  async write(data: any) {
    const text = JSON.stringify(data);
    await this.socket.send(text);
  }

  get closed() {
    return this.socket.isClosed;
  }

  async close() {
    if (this.closed) return;
    await this.socket.close();
    await this.emit("close");
  }
}
