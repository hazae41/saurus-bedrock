import {
  HTTPSOptions,
  serveTLS,
} from "https://deno.land/std@0.65.0/http/server.ts";

import {
  acceptWebSocket,
  WebSocket,
  isWebSocketPingEvent,
  isWebSocketCloseEvent
} from "https://deno.land/std@0.65.0/ws/mod.ts";

import { EventEmitter } from "https://deno.land/x/mutevents@2.2/mod.ts";

export class WSHandler extends EventEmitter<"accept"> {
  constructor(
    readonly options: HTTPSOptions,
  ) {
    super();

    this.listen();
  }

  private async listen() {
    try {
      for await (const req of serveTLS(this.options)) {
        const { conn, r: bufReader, w: bufWriter, headers } = req;

        try {
          const socket = await acceptWebSocket({
            conn,
            bufReader,
            bufWriter,
            headers,
          });

          const connection = new WSConnection(socket);
          this.emit("accept", connection);
        } catch (e) {
          await req.respond({ status: 400 });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export class WSConnection extends EventEmitter<"message"> {
  constructor(
    readonly socket: WebSocket,
  ) {
    super();
  }

  async* listen() {
    for await (const e of this.socket) {
      if (isWebSocketPingEvent(e)) continue;
      if (isWebSocketCloseEvent(e)) return;
      if (typeof e !== "string") return;

      const data = JSON.parse(e);
      yield data;
    }
  }

  async read() {
    for await (const msg of this.listen())
      return msg;
  }

  async write(data: any) {
    const text = JSON.stringify(data);
    await this.socket.send(text);
  }

  get closed() {
    return this.socket.isClosed;
  }

  async close(reason = "") {
    if (this.closed) return;
    await this.socket.close(1000, reason);
  }
}
