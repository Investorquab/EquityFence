import assert from "node:assert/strict";
import test from "node:test";

const bawCommand = process.platform === "win32" ? "baw.cmd" : "baw";
const bawShell = process.platform === "win32";

test("uses the Windows baw command shim when running on Windows", () => {
  assert.equal(bawCommand, process.platform === "win32" ? "baw.cmd" : "baw");
  assert.equal(bawShell, process.platform === "win32");
});
