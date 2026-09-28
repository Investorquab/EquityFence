const API_BASE = window.HANDELO_API_URL || localStorage.getItem("handelo_api_url") || "http://localhost:8787";

const conversation = document.querySelector("#conversation");
const welcome = document.querySelector("#welcome");
const composer = document.querySelector("#composer");
const input = document.querySelector("#messageInput");
const sendButton = document.querySelector("#sendButton");
const connectButton = document.querySelector("#connectButton");
const marketGrid = document.querySelector("#marketGrid");

function money(value) {
  const n = Number(value);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n)
    : "—";
}

function addUserMessage(message) {
  if (welcome) welcome.remove();
  const node = document.createElement("article");
  node.className = "message user-message";
  node.innerHTML = '<div class="message-label">YOU</div><div class="message-text"></div>';
  node.querySelector(".message-text").textContent = message;
  conversation.appendChild(node);
  scrollConversation();
}

function addAgentMessage(data) {
  const node = document.createElement("article");
  node.className = "message agent-message";
  node.innerHTML = '<div class="message-label">HANDELO</div><div class="message-text"></div><div class="market-context"></div>';
  node.querySelector(".message-text").textContent = data.answer || "I could not generate an explanation.";
  const context = node.querySelector(".market-context");

  if (data.market) {
    context.classList.add("visible");
    renderMarketContext(context, data.market);
  } else if (Array.isArray(data.candidates) && data.candidates.length) {
    context.classList.add("visible");
    renderCandidates(context, data.candidates);
  }

  conversation.appendChild(node);

  const action = data.intent?.action;
  const amount = Number(data.intent?.amountUsd);
  if (
    data.market &&
    (action === "buy" || action === "invest") &&
    Number.isFinite(amount) &&
    amount > 0 &&
    data.policy?.decision !== "BLOCK"
  ) {
    addReviewPrompt(data.market, amount, action);
  }

  scrollConversation();
}

function addReviewPrompt(market, amountUsd, action) {
  const node = document.createElement("article");
  node.className = "review-prompt";
  node.innerHTML = `
    <div class="review-copy">
      <div class="message-label">NEXT STEP</div>
      <strong>Review a ${action === "invest" ? "purchase" : "buy"} of ${escapeHtml(market.ticker)}.</strong>
      <span>${money(amountUsd)} · policy checks will run before any transaction.</span>
    </div>
    <button type="button">Review</button>`;
  node.querySelector("button").addEventListener("click", () => reviewTrade(market.ticker, amountUsd, action, node));
  conversation.appendChild(node);
}

async function reviewTrade(ticker, amountUsd, action, promptNode) {
  promptNode.querySelector("button").disabled = true;
  promptNode.querySelector("button").textContent = "Checking";

  try {
    const response = await fetch(API_BASE + "/api/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker, amountUsd, action })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Review failed.");
    promptNode.remove();
    addReviewCard(data, amountUsd);
  } catch (error) {
    promptNode.querySelector("button").disabled = false;
    promptNode.querySelector("button").textContent = "Review";
    addAgentMessage({ answer: `I could not complete the transaction review. ${error.message}` });
  }
}

function addReviewCard(data, amountUsd) {
  const card = document.createElement("article");
  card.className = "trade-review";
  const policy = data.policy || {};
  const market = data.asset || {};
  const quote = data.quote;
  const decision = policy.decision || "BLOCK";
  const decisionLabel = decision === "READY" ? "READY FOR CONFIRMATION" : decision === "CONFIRM" ? "CONFIRM REQUIRED" : "BLOCKED";
  const quoteLine = quote
    ? `${escapeHtml(quote.fromCoinSymbol)} ${escapeHtml(quote.fromCoinAmount)} → ${escapeHtml(quote.toCoinAmount)} ${escapeHtml(quote.toCoinSymbol)}`
    : "Live quote unavailable until the Agentic Wallet is connected.";

  card.innerHTML = `
    <div class="review-head">
      <div>
        <div class="message-label">TRANSACTION REVIEW</div>
        <h3>Buy ${escapeHtml(market.ticker || "asset")}</h3>
      </div>
      <span class="review-status ${decision.toLowerCase()}">${decisionLabel}</span>
    </div>
    <div class="review-amount">${money(amountUsd)}<span>requested</span></div>
    <div class="review-grid">
      <div><small>ON-CHAIN</small><strong>${money(market.tokenPrice)}</strong></div>
      <div><small>REFERENCE</small><strong>${money(market.referencePrice)}</strong></div>
      <div><small>DIFFERENCE</small><strong>${market.premiumPct === null ? "—" : (market.premiumPct >= 0 ? "+" : "") + market.premiumPct.toFixed(2) + "%"}</strong></div>
      <div><small>MARKET</small><strong>${market.market?.openState ? "LIVE" : "CLOSED"}</strong></div>
    </div>
    <div class="review-quote">
      <span>EXPECTED ROUTE</span>
      <strong>${quoteLine}</strong>
    </div>
    <div class="review-reasons">
      ${(policy.reasons || []).map(reason => `<div>• ${escapeHtml(reason)}</div>`).join("")}
      ${data.quoteError ? `<div class="review-warning">• ${escapeHtml(data.quoteError)}</div>` : ""}
    </div>
    <div class="review-actions">
      <button type="button" class="secondary-action" data-cancel>Cancel</button>
      <button type="button" class="primary-action" data-confirm ${decision === "BLOCK" || !quote ? "disabled" : ""}>Confirm purchase</button>
    </div>`;

  card.querySelector("[data-cancel]").addEventListener("click", () => card.remove());
  card.querySelector("[data-confirm]").addEventListener("click", () => confirmTrade(data, amountUsd, card));
  conversation.appendChild(card);
  scrollConversation();
}

async function confirmTrade(data, amountUsd, card) {
  const button = card.querySelector("[data-confirm]");
  button.disabled = true;
  button.textContent = "Executing";

  try {
    const response = await fetch(API_BASE + "/api/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ticker: data.asset.ticker,
        amountUsd,
        fromToken: data.quoteToken,
        confirmed: true
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Execution failed.");
    card.remove();
    addExecutionResult(result);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Confirm purchase";
    addAgentMessage({ answer: `The transaction was not completed. ${error.message}` });
  }
}

function addExecutionResult(data) {
  const result = data.result || {};
  const node = document.createElement("article");
  node.className = "execution-result";
  if (result.status === "FINISHED") {
    node.innerHTML = `
      <div class="execution-icon">✓</div>
      <div>
        <div class="message-label">EXECUTION CONFIRMED</div>
        <h3>Purchase complete.</h3>
        <p>${escapeHtml(data.asset?.ticker || "Asset")} was purchased through the Agentic Wallet.</p>
        <span class="tx-hash">${escapeHtml(result.txHash || "Transaction hash unavailable")}</span>
      </div>`;
  } else if (result.status === "PENDING") {
    node.innerHTML = `
      <div class="execution-icon pending">·</div>
      <div>
        <div class="message-label">EXECUTION PENDING</div>
        <h3>Still processing.</h3>
        <p>The order was submitted, but Handelo has not received a terminal result yet.</p>
      </div>`;
  } else {
    node.innerHTML = `
      <div class="execution-icon failed">!</div>
      <div>
        <div class="message-label">EXECUTION FAILED</div>
        <h3>The purchase did not complete.</h3>
        <p>Handelo received a terminal failure from the execution layer.</p>
      </div>`;
  }
  conversation.appendChild(node);
  scrollConversation();
}

function renderMarketContext(container, market) {
  const gap = market.premiumPct;
  const gapText = gap === null ? "—" : (gap >= 0 ? "+" : "") + gap.toFixed(2) + "%";
  const status = market.marketOpen ? "LIVE" : "CLOSED";
  container.innerHTML = `
    <div class="context-head">
      <div class="context-name">${market.ticker} <span style="color:#5d5a53">/ ${market.tokenSymbol}</span></div>
      <div class="context-status ${market.marketOpen ? "" : "closed"}">${status} · BSC</div>
    </div>
    <div class="context-body">
      <div class="context-price"><strong>${money(market.tokenPrice)}</strong><span>ON-CHAIN PRICE</span></div>
      <div class="context-grid">
        <div class="metric"><div class="metric-label">Reference</div><div class="metric-value">${money(market.referencePrice)}</div></div>
        <div class="metric"><div class="metric-label">Difference</div><div class="metric-value ${gap === null ? "" : gap >= 0 ? "positive" : "negative"}">${gapText}</div></div>
        <div class="metric"><div class="metric-label">Market</div><div class="metric-value">${market.marketStatus || "—"}</div></div>
      </div>
      ${market.reason ? `<div class="context-reason">${escapeHtml(market.reason)}</div>` : ""}
    </div>`;
}

function renderCandidates(container, candidates) {
  container.innerHTML = `
    <div class="context-head">
      <div class="context-name">LIVE MARKET CONTEXT</div>
      <div class="context-status">BSC</div>
    </div>
    <div class="candidate-list">
      ${candidates.map((market) => `
        <div class="candidate">
          <div><strong>${escapeHtml(market.ticker)}</strong><small>${escapeHtml(market.tokenSymbol)}</small></div>
          <div class="candidate-price">${money(market.tokenPrice)}</div>
        </div>`).join("")}
    </div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function scrollConversation() {
  requestAnimationFrame(() => conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" }));
}

async function ask(message) {
  const clean = message.trim();
  if (!clean) return;
  addUserMessage(clean);
  input.value = "";
  sendButton.disabled = true;
  input.disabled = true;

  const thinking = document.createElement("article");
  thinking.className = "message agent-message";
  thinking.innerHTML = '<div class="message-label">HANDELO</div><div class="message-text">Reading the market<span class="thinking-dots"> ···</span></div>';
  conversation.appendChild(thinking);
  scrollConversation();

  try {
    const response = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: clean })
    });
    const data = await response.json();
    thinking.remove();
    if (!response.ok) throw new Error(data.error || "Handelo API request failed.");
    addAgentMessage(data);
  } catch (error) {
    thinking.remove();
    addAgentMessage({ answer: `I could not reach the Handelo agent. ${error.message}` });
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

async function loadMarkets() {
  marketGrid.innerHTML = '<div class="loading-card">Reading BSC market data...</div>';
  try {
    const response = await fetch(API_BASE + "/api/markets");
    const markets = await response.json();
    if (!response.ok || !Array.isArray(markets) || !markets.length) {
      throw new Error(markets.error || "No market records returned.");
    }
    marketGrid.innerHTML = markets.map(renderMarketCard).join("");
  } catch (error) {
    marketGrid.innerHTML = `<div class="loading-card">Market data is unavailable. ${escapeHtml(error.message)}</div>`;
  }
}

function renderMarketCard(market) {
  const gap = market.premiumPct;
  const gapText = gap === null ? "—" : (gap >= 0 ? "+" : "") + gap.toFixed(2) + "%";
  return `
    <article class="market-card">
      <div class="market-card-head">
        <div class="market-card-name">${escapeHtml(market.ticker)} <span>${escapeHtml(market.tokenSymbol)}</span></div>
        <div class="market-card-status ${market.marketOpen ? "" : "closed"}">${market.marketOpen ? "LIVE" : "CLOSED"}</div>
      </div>
      <div class="market-card-price"><strong>${money(market.tokenPrice)}</strong><span>ON-CHAIN</span></div>
      <div class="market-card-stats">
        <div><small>REFERENCE</small><b>${money(market.referencePrice)}</b></div>
        <div><small>DIFFERENCE</small><b class="${gap >= 0 ? "positive" : "negative"}">${gapText}</b></div>
      </div>
    </article>`;
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === "view-" + view));
    if (view === "markets") loadMarkets();
  });
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => ask(button.dataset.prompt || ""));
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  ask(input.value);
});

connectButton.addEventListener("click", () => {
  alert("Wallet connection is the next execution-layer step. Handelo does not ask for private keys.");
});

document.querySelector("#portfolioConnect")?.addEventListener("click", () => connectButton.click());

input.focus();
