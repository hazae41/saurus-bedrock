export * from "./minecraft.ts";
export * from "./players.ts";
export * from "./websockets.ts";
export * from "./connector.ts";
export * from "./types.ts"

export * as YAML from "https://deno.land/std@0.65.0/encoding/yaml.ts"
export * as FS from "https://deno.land/std@0.66.0/fs/mod.ts"

export const encode = (text: string) => new TextEncoder().encode(text);
export const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
