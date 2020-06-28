import { createHash } from "https://deno.land/std/hash/mod.ts";

export * from "https://deno.land/x/denoflate/mod.ts";
export * from "../../aescfb8/mod.ts";

export function sha256(...datas: ArrayBuffer[]) {
  const hash = createHash("sha256");
  for (const data of datas) {
    hash.update(data);
  }
  return new Uint8Array(hash.digest());
}
