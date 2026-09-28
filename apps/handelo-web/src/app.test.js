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

test("wallet authentication cleans up polling on completion, failure, timeout, and close", () => {
  assert.match(source, /let walletAuthPoll = null/);
  assert.match(source, /let walletAuthTimeout = null/);
  assert.match(source, /function clearWalletAuthPolling\(\)/);
  assert.match(source, /clearInterval\(walletAuthPoll\)/);
  assert.match(source, /clearTimeout\(walletAuthTimeout\)/);
  assert.match(source, /walletAuthPoll = setInterval/);
  assert.match(source, /walletAuthTimeout = setTimeout/);
  assert.match(source, /closeWalletAuth\(\)/);
});

test("wallet authentication reports polling failures instead of leaving an orphaned poll", () => {
  assert.match(source, /Wallet connection status could not be checked/);
  assert.match(source, /clearWalletAuthPolling\(\)/);
});

test("transaction review communicates async progress accessibly", () => {
  assert.match(source, /button\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /button\.setAttribute\("aria-label", "Checking transaction review"\)/);
  assert.match(source, /button\.removeAttribute\("aria-busy"\)/);
  assert.match(source, /button\.removeAttribute\("aria-label"\)/);
});

test("transaction confirmation communicates execution progress accessibly", () => {
  assert.match(source, /button\.setAttribute\("aria-label", "Executing purchase"\)/);
  assert.match(source, /button\.textContent = "Executing"/);
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


test("history navigation action exposes loading state", () => {
  assert.match(source, /event\.currentTarget/);
  assert.match(source, /aria-busy/);
  assert.match(source, /showView\("history"\)/);
});


test("portfolio refresh action communicates progress", () => {
  assert.match(source, /aria-busy/);
  assert.match(source, /button\.textContent = "Refreshing…"/);
});


test("history navigation action communicates progress", () => {
  assert.match(source, /aria-busy/);
  assert.match(source, /button\.textContent = "Opening…"/);
});


test("portfolio refresh progress has an accessible label", () => {
  assert.match(source, /aria-label\", \"Refreshing portfolio/);
});


test("history navigation progress has an accessible label", () => {
  assert.match(source, /aria-label\", \"Opening transaction history/);
});


test("history navigation marks itself busy while opening", () => {
  assert.match(source, /data-navigation-busy/);
  assert.match(source, /aria-busy/);
});


test("portfolio refresh marks itself busy while opening", () => {
  assert.match(source, /data-navigation-busy/);
  assert.match(source, /aria-busy/);
});


test("portfolio refresh exposes its disabled state", () => {
  assert.match(source, /aria-disabled/);
  assert.match(source, /\.disabled = true/);
});


test("history navigation exposes its disabled state", () => {
  assert.match(source, /aria-disabled/);
  assert.match(source, /\.disabled = true/);
});


test("history navigation marks itself disabled while opening", () => {
  assert.match(source, /data-navigation-disabled/);
  assert.match(source, /aria-disabled/);
});


test("disabled follow-up actions have a waiting state", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.secondary-button:disabled/);
  assert.match(styles, /cursor:wait/);
});


test("disabled primary actions have a waiting state", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.primary-button:disabled/);
  assert.match(styles, /cursor:wait/);
});


test("disabled execution follow-up actions block pointer clicks", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /pointer-events:none/);
});


test("disabled execution follow-up actions prevent selection", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /user-select:none/);
});


test("disabled execution follow-up actions disable transitions", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /transition:none/);
});


test("disabled execution follow-up actions lock position", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /transform:none!important/);
});


test("disabled execution follow-up actions are visually dimmed", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /opacity:\.65/);
});


test("disabled execution follow-up actions show a waiting cursor", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /cursor:wait/);
});


test("disabled execution follow-up actions mute visual treatment", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /filter:grayscale\(1\)/);
});


test("disabled execution follow-up actions remove visual shadow", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /box-shadow:none/);
});


test("disabled execution follow-up actions flatten background imagery", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /background-image:none/);
});


test("disabled execution follow-up actions simplify outline", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /outline:none/);
});


test("disabled execution follow-up actions stop animation", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /animation:none/);
});


test("disabled execution follow-up actions retain pointer lock", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /pointer-events:none/);
});


test("disabled execution follow-up actions signal disabled state", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /cursor:not-allowed/);
});


test("disabled execution follow-up actions prevent text selection", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /user-select:none/);
});


test("disabled execution follow-up actions strengthen dimming", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /opacity:\.55/);
});


test("disabled execution follow-up actions soften their border", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /border-color:transparent/);
});


test("disabled execution follow-up actions flatten their fill", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /background-color:transparent/);
});


test("disabled execution follow-up actions mute text", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /color:var\(--faint\)/);
});


test("disabled execution follow-up actions mute their text", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /color:var\(--faint\)/);
});

  assert.match(source, /button\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /button\.setAttribute\("aria-label", "Checking transaction review"\)/);
  assert.match(source, /button\.removeAttribute\("aria-busy"\)/);
  assert.match(source, /button\.removeAttribute\("aria-label"\)/);
});

test("transaction confirmation communicates execution progress accessibly", () => {
  assert.match(source, /button\.setAttribute\("aria-label", "Executing purchase"\)/);
  assert.match(source, /button\.textContent = "Executing"/);
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


test("history navigation action exposes loading state", () => {
  assert.match(source, /event\.currentTarget/);
  assert.match(source, /aria-busy/);
  assert.match(source, /showView\("history"\)/);
});


test("portfolio refresh action communicates progress", () => {
  assert.match(source, /aria-busy/);
  assert.match(source, /button\.textContent = "Refreshing…"/);
});


test("history navigation action communicates progress", () => {
  assert.match(source, /aria-busy/);
  assert.match(source, /button\.textContent = "Opening…"/);
});


test("portfolio refresh progress has an accessible label", () => {
  assert.match(source, /aria-label\", \"Refreshing portfolio/);
});


test("history navigation progress has an accessible label", () => {
  assert.match(source, /aria-label\", \"Opening transaction history/);
});


test("history navigation marks itself busy while opening", () => {
  assert.match(source, /data-navigation-busy/);
  assert.match(source, /aria-busy/);
});


test("portfolio refresh marks itself busy while opening", () => {
  assert.match(source, /data-navigation-busy/);
  assert.match(source, /aria-busy/);
});


test("portfolio refresh exposes its disabled state", () => {
  assert.match(source, /aria-disabled/);
  assert.match(source, /\.disabled = true/);
});


test("history navigation exposes its disabled state", () => {
  assert.match(source, /aria-disabled/);
  assert.match(source, /\.disabled = true/);
});


test("history navigation marks itself disabled while opening", () => {
  assert.match(source, /data-navigation-disabled/);
  assert.match(source, /aria-disabled/);
});


test("disabled follow-up actions have a waiting state", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.secondary-button:disabled/);
  assert.match(styles, /cursor:wait/);
});


test("disabled primary actions have a waiting state", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.primary-button:disabled/);
  assert.match(styles, /cursor:wait/);
});


test("disabled execution follow-up actions block pointer clicks", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /pointer-events:none/);
});


test("disabled execution follow-up actions prevent selection", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /user-select:none/);
});


test("disabled execution follow-up actions disable transitions", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /transition:none/);
});


test("disabled execution follow-up actions lock position", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /transform:none!important/);
});


test("disabled execution follow-up actions are visually dimmed", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /opacity:\.65/);
});


test("disabled execution follow-up actions show a waiting cursor", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /cursor:wait/);
});


test("disabled execution follow-up actions mute visual treatment", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /filter:grayscale\(1\)/);
});


test("disabled execution follow-up actions remove visual shadow", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /box-shadow:none/);
});


test("disabled execution follow-up actions flatten background imagery", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /background-image:none/);
});


test("disabled execution follow-up actions simplify outline", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /outline:none/);
});


test("disabled execution follow-up actions stop animation", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /animation:none/);
});


test("disabled execution follow-up actions retain pointer lock", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /pointer-events:none/);
});


test("disabled execution follow-up actions signal disabled state", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /cursor:not-allowed/);
});


test("disabled execution follow-up actions prevent text selection", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /user-select:none/);
});


test("disabled execution follow-up actions strengthen dimming", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /opacity:\.55/);
});


test("disabled execution follow-up actions soften their border", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /border-color:transparent/);
});


test("disabled execution follow-up actions flatten their fill", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /background-color:transparent/);
});


test("disabled execution follow-up actions mute text", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /color:var\(--faint\)/);
});


test("disabled execution follow-up actions mute their text", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /\.execution-actions button:disabled/);
  assert.match(styles, /color:var\(--faint\)/);
});
