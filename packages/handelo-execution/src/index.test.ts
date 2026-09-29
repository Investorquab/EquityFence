import assert from "node:assert/strict";
import test from "node:test";
import { BAW_COMMAND, BAW_SHELL } from "./index.js";

test("uses the Windows baw command shim when running on Windows", () => {
  assert.equal(BAW_COMMAND, process.platform === "win32" ? "baw.cmd" : "baw");
  assert.equal(BAW_SHELL, process.platform === "win32");
});
