import { createHash } from "https://deno.land/std/hash/mod.ts";

export { deflate, inflate } from "https://deno.land/x/denoflate/mod.ts";
export { Aes256Cfb8 } from "../../aescfb/mod.ts";

export function sha256(...datas: ArrayBuffer[]) {
  const hash = createHash("sha256");
  for (const data of datas) {
    hash.update(data);
  }
  return new Uint8Array(hash.digest());
}
