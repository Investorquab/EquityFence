import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("./app.js", import.meta.url));
const source = readFileSync(appPath, "utf8");

test("selected representation is reviewed directly without re-resolving through chat", () => {
  assert.match(
    source,
    /reviewTrade\(market\.tokenSymbol, amount, action, prompt\)/
  );
  assert.match(
    source,
    /SELECTED REPRESENTATION/
  );
  assert.doesNotMatch(
    source,
    /prompt\.querySelector\("button"\)\.addEventListener\("click", \(\) => ask\(/
  );
});

test("selection keeps the user's amount and action in the review prompt", () => {
  assert.match(source, /Number\.isFinite\(amount\) && amount > 0/);
  assert.match(source, /money\(amount\)/);
  assert.match(source, /action === "invest" \? "purchase" : "buy"/);
});

test("trade review renders explicit cancel and confirmation actions", () => {
  assert.match(source, /data-cancel/);
  assert.match(source, /data-confirm/);
  assert.match(source, /Confirm purchase/);
});

test("trade confirmation stays disabled unless a valid review can execute", () => {
  assert.match(source, /decision !== "BLOCK" && !securityBlocked && Boolean\(data\.reviewToken && quote\)/);
  assert.match(source, /canConfirm \? "" : "disabled"/);
});
