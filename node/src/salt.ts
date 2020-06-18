import { createInterface } from "readline";
import { randomBytes } from "crypto";

const std = createInterface(process.stdin);

std.on("line", () => {
  const { stringify } = JSON;
  const salt = randomBytes(16);
  const response = salt.toString("base64");
  console.log(stringify(response));
  process.exit(0);
});
