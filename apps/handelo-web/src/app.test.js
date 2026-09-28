import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("./app.js", import.meta.url));
const source = readFileSync(appPath, "utf8");

test("selected representation is reviewed directly without re-resolving through chat", () => {
  assert.match(source, /reviewTrade\(market\.tokenSymbol, amount, action, prompt\)/);
  assert.match(source, /SELECTED REPRESENTATION/);
  assert.doesNotMatch(source, /prompt\.querySelector\("button"\)\.addEventListener\("click", \(\) => ask\(/);
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

test("trade confirmation submits the reviewed transaction with explicit confirmation", () => {
  assert.match(source, /API_BASE \+ "\/api\/execute"/);
  assert.match(source, /ticker: data\.asset\.ticker/);
  assert.match(source, /amountUsd,/);
  assert.match(source, /fromToken: data\.quoteToken/);
  assert.match(source, /reviewToken: data\.reviewToken/);
  assert.match(source, /confirmed: true/);
});

test("execution result surfaces terminal status without trusting an invalid transaction hash", () => {
  assert.match(source, /result\.status === "FINISHED"/);
  assert.match(source, /result\.status === "PENDING"/);
  assert.match(source, /EXECUTION FAILED/);
  assert.match(source, /result\.orderId/);
  assert.match(source, /result\.toCoinAmount/);
  assert.match(source, /\/\^0x\[a-fA-F0-9\]\{64\}\$\//);
  assert.match(source, /Transaction hash unavailable/);
});

test("finished execution offers a direct path to refreshed portfolio state", () => {
  assert.match(source, /data-refresh-portfolio/);
  assert.match(source, /showView\("portfolio"\)/);
  assert.match(source, /function showView\(view\)/);
  assert.match(source, /if \(view === "portfolio"\) loadPortfolio\(\)/);
});

test("finished execution exposes both portfolio and history follow-up actions", () => {
  assert.match(source, /data-refresh-portfolio/);
  assert.match(source, /data-view-history/);
  assert.match(source, /showView\("portfolio"\)/);
  assert.match(source, /showView\("history"\)/);
  assert.match(source, /function showView\(view\)/);
});


test("non-finished execution results retain a history follow-up", () => {
  assert.match(source, /EXECUTION PENDING/);
  assert.match(source, /EXECUTION FAILED/);
  assert.match(source, /data-view-history/);
  assert.match(source, /showView\("history"\)/);
});


test("execution outcomes are announced to assistive technology", () => {
  assert.match(source, /node\.setAttribute\("role", "status"\)/);
  assert.match(source, /node\.setAttribute\("aria-live", "polite"\)/);
});


test("execution follow-up actions have dedicated styles", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions/);
  assert.match(styles, /\.secondary-button/);
});


test("portfolio refresh action disables itself before navigation", () => {
  assert.match(source, /data-refresh-portfolio/);
  assert.match(source, /\.disabled = true/);
  assert.match(source, /showView\("portfolio"\)/);
});


test("history follow-up action disables itself before navigation", () => {
  assert.match(source, /data-view-history/);
  assert.match(source, /\.disabled = true/);
  assert.match(source, /showView\("history"\)/);
});


test("portfolio refresh action exposes loading state", () => {
  assert.match(source, /event\.currentTarget/);
  assert.match(source, /aria-busy/);
  assert.match(source, /showView\("portfolio"\)/);
});
