export * from "./minecraft.ts";
export * from "./players.ts";
export * from "./websockets.ts";
export * from "./connect.ts";
export * as Files from "./files.ts";

export const encode = (text: string) => new TextEncoder().encode(text);
export const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
