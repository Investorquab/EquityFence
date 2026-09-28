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
