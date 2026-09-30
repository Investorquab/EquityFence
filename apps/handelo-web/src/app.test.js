import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("./app.js", import.meta.url));
const source = readFileSync(appPath, "utf8");
const indexSource = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");

test("workspace is the single primary application view", () => {
  assert.match(indexSource, /data-view="workspace"/);
  assert.match(indexSource, /id="view-workspace"/);
  assert.match(indexSource, /class="workspace-grid"/);
  assert.match(indexSource, /class="workspace-context"/);
  assert.match(indexSource, /class="workspace-chat"/);
  assert.match(source, /function showView\(\)/);
  assert.match(source, /section\.id === "view-workspace"/);
});

test("workspace keeps market, wallet, portfolio, strategy, risk, and activity context visible", () => {
  for (const id of ["workspaceMarket","workspaceWalletBalance","workspaceWalletAddress","workspacePortfolio","workspaceStrategies","workspaceRiskState","workspaceActivity"]) {
    assert.match(indexSource, new RegExp(`id="${id}"`));
  }
});

test("workspace context refreshes from live market, gap radar, and wallet APIs", () => {
  assert.match(source, /API_BASE \+ "\/api\/markets"/);
  assert.match(source, /API_BASE \+ "\/api\/gap-radar\?limit=5/);
  assert.match(source, /function renderWorkspaceGapRadar\(markets\)/);
  assert.match(source, /API_BASE \+ "\/api\/wallet\/address"/);
  assert.match(source, /API_BASE \+ "\/api\/portfolio\?wallet=/);
  assert.match(source, /API_BASE \+ "\/api\/history\?wallet=/);
  assert.match(source, /function refreshWorkspaceContext\(\)/);
});

test("chat remains embedded as the workspace control surface", () => {
  assert.match(indexSource, /id="conversation"/);
  assert.match(indexSource, /id="composer"/);
  assert.match(indexSource, /id="messageInput"/);
  assert.match(source, /async function ask\(/);
  assert.match(source, /API_BASE \+ "\/api\/chat"/);
});

test("chat responses auto-scroll to the latest content", () => {
  assert.match(source, /conversation\.scrollTo\(\{ top: conversation\.scrollHeight/);
});

test("structured market insight remains available in chat", () => {
  assert.match(source, /context-kicker/);
  assert.match(source, /MARKET INSIGHT/);
  assert.match(source, /function renderMarketContext/);
  assert.match(source, /function renderCandidates/);
  assert.match(source, /data\.market/);
  assert.match(source, /data\.candidates/);
});

test("transaction review requires policy and security checks before confirmation", () => {
  assert.match(source, /decision !== "BLOCK" && !riskBlocked && !securityBlocked && Boolean\(data\.reviewToken && quote\)/);
  assert.match(source, /data-cancel/);
  assert.match(source, /data-confirm/);
  assert.match(source, /Confirm purchase/);
});

test("transaction execution remains explicitly confirmed and status-aware", () => {
  assert.match(source, /confirmed: true/);
  assert.match(source, /result\.status === "FINISHED"/);
  assert.match(source, /result\.status === "PENDING"/);
  assert.match(source, /EXECUTION FAILED/);
  assert.match(source, /Transaction hash unavailable/);
});

test("execution follow-ups refresh the unified workspace instead of navigating to subpages", () => {
  assert.match(source, /data-refresh-portfolio/);
  assert.match(source, /data-view-history/);
  assert.match(source, /refreshWorkspaceContext\(\)/);
  assert.doesNotMatch(source, /showView\("portfolio"\)/);
  assert.doesNotMatch(source, /showView\("history"\)/);
});

test("wallet authentication guards duplicate sessions and stale responses", () => {
  assert.match(source, /let walletAuthActive = false/);
  assert.match(source, /if \(walletAuthActive\) return/);
  assert.match(source, /walletAuthSessionId/);
  assert.match(source, /clearWalletAuthPolling\(\)/);
});

test("market records are normalized before rendering", () => {
  assert.match(source, /function normalizeMarketRecord\(market\)/);
  assert.match(source, /marketRecords = markets\.map\(normalizeMarketRecord\)/);
  assert.match(source, /premiumPct/);
});

test("workspace exposes a persistent Gap Radar context panel", () => {
  assert.match(indexSource, /id="workspaceGapRadar"/);
  assert.match(indexSource, /id="workspaceGapRadarStatus"/);
  assert.match(source, /workspaceGapRadar/);
  assert.match(source, /divergencePercent/);
});

test("workspace market context includes a truthful current price comparison", () => {
  assert.match(source, /workspace-price-compare/);
  assert.match(source, /on-chain versus reference price comparison/);
  assert.match(source, /referencePrice \/ scale/);
});

test("workspace styling defines the persistent two-column layout", () => {
  assert.match(styles, /\.workspace-grid/);
  assert.match(styles, /\.workspace-context/);
  assert.match(styles, /\.workspace-chat/);
});

test("frontend exposes keyboard-visible focus states", () => {
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /outline:/);
});

test("chat composer requires a non-empty message", () => {
  assert.match(indexSource, /id="messageInput"[^>]*required/);
});


test("strategy preview is rendered from agent strategy data",()=>{assert.match(source,/data\.strategy/);assert.match(source,/function addStrategyPreview\(strategy\)/);assert.match(source,/STRATEGY PREVIEW/);});

test("strategy preview exposes deterministic portfolio risk review",()=>{assert.match(source,/api\/strategy\/risk/);assert.match(source,/PORTFOLIO RISK/);assert.match(source,/activation remains blocked/);});

test("transaction preview requires portfolio risk to pass before confirmation",()=>{assert.match(source,/riskDecision !== "PASS"/);assert.match(source,/PORTFOLIO RISK/);assert.match(source,/TRANSACTION PREVIEW/);assert.match(source,/wallet: workspaceWalletAddress/);});
