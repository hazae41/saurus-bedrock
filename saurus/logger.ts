import { encode } from "./mod.ts";

export const file = await Deno.open(
  "log.txt",
  { write: true, append: true, create: true, read: true },
);

export function time(millis?: number) {
  const twoDigits = (n: number) => `0${n}`.slice(-2);

  if (!millis) millis = Date.now();
  const date = new Date(millis);

  const year = date.getFullYear();
  const month = twoDigits(date.getMonth());
  const day = twoDigits(date.getDate());
  const hours = twoDigits(date.getHours());
  const minutes = twoDigits(date.getMinutes());
  const seconds = twoDigits(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function info(line: string) {
  log(`[${time()} INFO] ${line}`);
}

export function warning(line: string) {
  log(`[${time()} WARNING] ${line}`);
}

export function log(line: string, newline = true) {
  if (newline) line = line + "\n";
  const encoded = encode(line);
  Deno.stdout.write(encoded);
  file.write(encoded);
}

export function error(line: string, newline = true) {
  if (newline) line = line + "\n";
  const encoded = encode(line);
  Deno.stderr.write(encoded);
  file.write(encoded);
}
