import assert from "node:assert/strict";
import test from "node:test";
import { BAW_COMMAND, BAW_SHELL, TOKEN_AUDIT_HEADERS } from "./index.js";

test("uses the Windows baw command shim when running on Windows", () => {
  assert.equal(BAW_COMMAND, process.platform === "win32" ? "baw.cmd" : "baw");
  assert.equal(BAW_SHELL, process.platform === "win32");
});

test("sends Binance's documented agent headers for token audits", () => {
  assert.deepEqual(TOKEN_AUDIT_HEADERS, {
    "content-type": "application/json",
    "source": "agent",
    "accept-encoding": "identity",
    "user-agent": "binance-web3/1.4 (Skill)"
  });
});
