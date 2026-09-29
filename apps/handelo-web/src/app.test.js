import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("./app.js", import.meta.url));
const source = readFileSync(appPath, "utf8");
const indexSource = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");

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

test("wallet authentication resets active state when startup fails", () => {
  assert.match(source, /catch \(error\) \{\r?\n    if \(sessionId !== walletAuthSessionId \|\| !walletAuthActive\) return;\r?\n    walletAuthActive = false;/);
});

test("wallet authentication prevents duplicate sessions while active", () => {
  assert.match(source, /let walletAuthActive = false/);
  assert.match(source, /if \(walletAuthActive\) return/);
  assert.match(source, /walletAuthActive = true/);
  assert.match(source, /connectButton\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /walletAuthActive = false/);
  assert.match(source, /connectButton\.removeAttribute\("aria-busy"\)/);
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

test("transaction review communicates async progress accessibly", () => {
  assert.match(source, /button\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /button\.setAttribute\("aria-label", "Checking transaction review"\)/);
  assert.match(source, /button\.removeAttribute\("aria-busy"\)/);
  assert.match(source, /button\.removeAttribute\("aria-label"\)/);
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


test("primary navigation exposes the active page semantically", () => {
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  assert.match(html, /<nav class="nav" aria-label="Primary">/);
  assert.match(html, /data-view="chat" aria-current="page"/);
  assert.match(source, /item\.setAttribute\("aria-current", "page"\)/);
  assert.match(source, /item\.removeAttribute\("aria-current"\)/);
});

test("frontend views expose labelled sections and live loading state", () => {
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  assert.match(html, /id="view-chat" aria-labelledby="chat-title"/);
  assert.match(html, /id="view-markets" aria-labelledby="markets-title"/);
  assert.match(html, /id="view-portfolio" aria-labelledby="portfolio-title"/);
  assert.match(html, /id="view-history" aria-labelledby="history-title"/);
  assert.match(html, /id="marketGrid" aria-live="polite" aria-busy="true"/);
  assert.match(source, /marketGrid\.setAttribute\("aria-busy", "false"\)/);
  assert.match(source, /target\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /target\.setAttribute\("aria-busy", "false"\)/);
});

test("chat composer requires a non-empty message", () => {
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  assert.match(html, /id="messageInput"[^>]*required/);
});


test("frontend exposes keyboard-visible focus states", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /:focus-visible/);
});

test("frontend focus states remain usable on dark surfaces", () => {
  const styles = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  assert.match(styles, /outline:/);
  assert.match(styles, /outline-offset:/);
});


test("wallet authentication dialog manages keyboard focus", () => {
  assert.match(source, /walletAuthReturnFocus/);
  assert.match(source, /aria-describedby="wallet-description"/);
  assert.match(source, /document\.activeElement/);
  assert.match(source, /keydown/);
  assert.match(source, /key === "Escape"/);
  assert.match(source, /focus\(\)/);
});


test("chat submission exposes an accessible busy state", () => {
  assert.match(source, /sendButton\.setAttribute\("aria-busy", "true"\)/);
  assert.match(source, /sendButton\.setAttribute\("aria-busy", "false"\)/);
  assert.match(source, /thinking\.setAttribute\("aria-live", "polite"\)/);
});




test("data views guard against stale responses", () => {
  assert.match(source, /let dataViewRequestId = 0/);
  assert.match(source, /const requestId = \+\+dataViewRequestId/);
  assert.match(source, /requestId !== dataViewRequestId/);
});


test("history address loading ignores stale responses", () => {
  const history = source.slice(source.indexOf("async function loadHistory"), source.indexOf("function showView"));
  assert.match(history, /const address = await addressResponse\.json\(\);\s+if \(requestId !== dataViewRequestId\) return;/);
  assert.match(history, /const data = await response\.json\(\);\s+if \(requestId !== dataViewRequestId\) return;/);
});


test("transaction reviews guard against stale responses", () => {
  assert.match(source, /const tradeReviewRequestIds = new WeakMap\(\)/);
  assert.match(source, /tradeReviewRequestIds\.set\(promptNode, requestId\)/);
  assert.match(source, /tradeReviewRequestIds\.get\(promptNode\) !== requestId/);
});


test("transaction execution guards against stale responses", () => {
  assert.match(source, /const executionRequestIds = new WeakMap\(\)/);
  assert.match(source, /executionRequestIds\.set\(card, requestId\)/);
  assert.match(source, /executionRequestIds\.get\(card\) !== requestId/);
});


test("wallet status refresh guards against stale responses", () => {
  assert.match(source, /const walletStatusRequestIds = new WeakMap\(\)/);
  assert.match(source, /walletStatusRequestIds\.set\(connectButton, requestId\)/);
  assert.match(source, /walletStatusRequestIds\.get\(connectButton\) !== requestId/);
});


test("chat requests guard against stale responses", () => {
  assert.match(source, /let chatRequestId = 0/);
  assert.match(source, /const requestId = \+\+chatRequestId/);
  assert.match(source, /requestId !== chatRequestId/);
});


test("chat and wallet errors safely parse malformed error payloads", () => {
  assert.match(source, /\(data && typeof data === "object" && data\.error\) \|\| "Handelo API request failed\."/);
  assert.match(source, /\(data && typeof data === "object" && data\.error\) \|\| "Could not start wallet connection\."/);
});

test("trade errors safely parse malformed error payloads", () => {
  assert.match(source, /\(data && typeof data === "object" && data\.error\) \|\| "Review failed\."/);
  assert.match(source, /\(result && typeof result === "object" && result\.error\) \|\| "Execution failed\."/);
});

test("data view errors safely parse malformed error payloads", () => {
  const views = source.slice(source.indexOf("async function loadPortfolio"), source.indexOf("function showView"));
  assert.match(views, /\(data && typeof data === "object" && data\.error\) \|\| "Portfolio request failed\."/);
  assert.match(views, /\(markets && typeof markets === "object" && markets\.error\) \|\| "No market records returned\."/);
  assert.match(views, /\(data && typeof data === "object" && data\.error\) \|\| "History request failed\."/);
});

test("data view errors ignore stale requests", () => {
  const views = source.slice(source.indexOf("async function loadPortfolio"), source.indexOf("function showView"));
  assert.equal((views.match(/if \(requestId !== dataViewRequestId\) return;/g) || []).length, 8);
});

test("data view failures are announced as alerts", () => {
  const views = source.slice(source.indexOf("async function loadPortfolio"), source.indexOf("function showView"));
  assert.equal((views.match(/role="alert"/g) || []).length, 3);
  assert.match(views, /Portfolio data is unavailable/);
  assert.match(views, /Market data is unavailable/);
  assert.match(views, /History data is unavailable/);
});

test("portfolio and history validate response shapes before rendering", () => {
  assert.match(source, /if \(!data \|\| !Array\.isArray\(data\.positions\)\) throw new Error\("Portfolio response was invalid\."\);/);
  assert.match(source, /if \(!Array\.isArray\(data\.transactions\)\) throw new Error\("History response was invalid\."\);/);
});

test("chat and wallet flows validate response shapes before using them", () => {
  assert.match(source, /if \(!data \|\| typeof data !== "object" \|\| typeof data\.answer !== "string"\) throw new Error\("Handelo response was invalid\."\);/);
  assert.match(source, /if \(!data \|\| typeof data !== "object" \|\| typeof data\.status !== "string"\) throw new Error\("Wallet status response was invalid\."\);/);
  assert.match(source, /if \(!data \|\| typeof data !== "object" \|\| typeof data\.status !== "string"\) throw new Error\("Wallet authentication response was invalid\."\);/);
});

test("wallet polling validates status response shapes", () => {
  assert.match(source, /if \(!auth \|\| typeof auth !== "object" \|\| typeof auth\.status !== "string"\)/);
  assert.match(source, /Wallet authentication status response was invalid/);
});

test("wallet polling ignores stale sessions after close or replacement", () => {
  assert.match(source, /let walletAuthSessionId = 0/);
  assert.match(source, /const sessionId = \+\+walletAuthSessionId/);
  assert.match(source, /if \(sessionId !== walletAuthSessionId \|\| !walletAuthActive\) return;/);
  assert.match(source, /walletAuthSessionId \+= 1;/);
});


test("wallet authentication ignores stale startup responses after close or replacement", () => {
  assert.match(source, /if \(sessionId !== walletAuthSessionId \|\| !walletAuthActive\) return;/);
  assert.match(source, /const data = await response\.json\(\);\r?\n    if \(sessionId !== walletAuthSessionId \|\| !walletAuthActive\) return;/);
  assert.match(source, /catch \(error\) \{\r?\n    if \(sessionId !== walletAuthSessionId \|\| !walletAuthActive\) return;/);
});


test("wallet authentication ignores stale polling errors after close or replacement", () => {
  assert.match(source, /catch \(error\) \{\r?\n        if \(sessionId !== walletAuthSessionId \|\| !walletAuthActive\) return;\r?\n        clearWalletAuthPolling\(\);/);
});

test("stale chat responses remove their own thinking state without changing the active request", () => {
  assert.match(source, /if \(requestId !== chatRequestId\) \{\r?\n      thinking\.remove\(\);\r?\n      return;\r?\n    \}/);
  assert.match(source, /catch \(error\) \{\r?\n    if \(requestId !== chatRequestId\) \{\r?\n      thinking\.remove\(\);\r?\n      return;\r?\n    \}/);
});


test("markets expose searchable discovery controls", () => {
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  assert.match(html, /id="marketSearch"/);
  assert.match(html, /aria-label="Search markets"/);
  assert.match(source, /let marketRecords = \[\]/);
  assert.match(source, /function renderMarketResults\(\)/);
  assert.match(source, /marketSearch\?\.addEventListener\("input", renderMarketResults\)/);
});

test("market search matches ticker, token symbol, and provider", () => {
  assert.match(source, /\[market\.ticker, market\.tokenSymbol, market\.provider\]/);
  assert.match(source, /toLowerCase\(\)\.includes\(query\)/);
  assert.match(source, /No markets match that search/);
});


test("market cards expose live detail actions", () => {
  assert.match(source, /data-market-detail/);
  assert.match(source, /function openMarketDetail\(index\)/);
  assert.match(source, /Ask Handelo about this/);
  assert.match(source, /marketGrid\.addEventListener\("click"/);
});

test("market detail uses existing market context without inventing metrics", () => {
  assert.match(source, /market\.tokenPrice/);
  assert.match(source, /market\.referencePrice/);
  assert.match(source, /market\.premiumPct/);
  assert.match(source, /marketSchedule\(market\)/);
});


test('market detail exposes same-ticker representations', () => {
  assert.match(source, /marketRecords\.filter\(\(candidate\) => candidate\.ticker === market\.ticker\)/);
  assert.match(source, /AVAILABLE REPRESENTATIONS/);
  assert.match(source, /data-market-representation/);
});


test("wallet state is announced accessibly", () => {
  assert.match(indexSource, /class="wallet-state" aria-live="polite"/);
  assert.match(source, /WALLET CONNECTED/);
  assert.match(source, /WALLET NOT CONNECTED/);
});
