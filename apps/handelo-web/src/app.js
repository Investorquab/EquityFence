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
    const response = await fetch(API_BASE + "/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Show me a concise view of the most active tokenized stock markets." })
    });
    const data = await response.json();
    const markets = data.candidates || (data.market ? [data.market] : []);
    if (!response.ok || !markets.length) throw new Error(data.error || "No market records returned.");
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
