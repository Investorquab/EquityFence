import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./server.ts", import.meta.url)), "utf8");

test("wallet auth uses the platform-safe BAW command configuration", () => {
  assert.match(source, /import \{ BAW_COMMAND, BAW_SHELL, BinanceAgenticWalletAdapter \} from "@handelo\/execution";/);
  assert.match(source, /execFileAsync\(BAW_COMMAND, \[\.\.\.args, "--json"\], \{ maxBuffer: 1024 \* 1024, shell: BAW_SHELL \}\)/);
});
