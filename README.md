# Handelo

**Understand. Strategize. Execute.**

Handelo is an AI operating layer for tokenized-stock markets on BNB Smart Chain. It combines live market intelligence, natural-language strategy construction, portfolio context, deterministic risk controls, human-approved transaction review, and a secured Agentic Wallet boundary.

## Product workflow

`Discover → Understand → Strategize → Check Risk → Review → Approve → Execute → Monitor`

Handelo is not a chatbot-only product. The web workspace keeps market and portfolio context visible beside persistent AI Chat.

## Product surfaces

### Web
Handelo has exactly two primary web pages:

1. **Home** — product narrative, workflow and real UI demonstrations.
2. **Workspace** — one persistent application page with financial/market context on the left and AI Chat on the right.

### SDK
`@handelo/sdk` provides a typed client for sending natural-language requests to the same Handelo runtime.

### MCP
`@handelo/mcp` exposes read-only tokenized-stock market-intelligence tools. MCP is not a signing boundary.

### Telegram
`@handelo/telegram` provides a private-chat conversational client over the same runtime. It does not hold private keys, activate strategies, or bypass risk/review controls.

## Architecture

```
User
  ↓
Handelo control surface
  ├── Web Workspace
  ├── @handelo/sdk
  ├── Telegram
  └── MCP (read-only)
        ↓
   Handelo Agent
        ↓
  Market Intelligence
  Strategy Engine
  Portfolio Engine
  Risk Governor
        ↓
 Human Approval / Review
        ↓
 Secured Agentic Wallet
        ↓
     BSC execution
```

AI interprets intent and explains context. Deterministic application code remains authoritative for policy, transaction construction, approval boundaries, execution state, and verification.

## Local development

```bash
pnpm install
pnpm check
pnpm test
```

Run the API:

```bash
pnpm --filter @handelo/api dev
```

The web client uses `http://localhost:8787` by default.

### SDK

```ts
import { createHandeloClient } from "@handelo/sdk";

const handelo = createHandeloClient({
  baseUrl: "http://localhost:8787",
});

const result = await handelo.chat({
  message: "What is happening with NVIDIA?",
});
```

### Telegram

Set:

- `TELEGRAM_BOT_TOKEN`
- `HANDELO_API_URL` (optional; defaults to local API)
- `HANDELO_API_KEY` when required by the API

Then:

```bash
pnpm --filter @handelo/telegram start
```

The bot accepts private chats only.

## Live market data

Configure Binance Web3 credentials in the runtime environment:

- `BINANCE_WEB3_API_KEY`
- `BINANCE_WEB3_SECRET_KEY`

Never commit secrets or private keys.

## Security boundary

- Private keys never enter the LLM, SDK, MCP or Telegram bot.
- Transaction execution requires explicit user confirmation.
- Risk and market checks are re-run at the execution boundary.
- Unsupported or unavailable security/audit paths remain blocking conditions.
- Handelo never fabricates transaction hashes or execution success.
- Ambiguous tokenized-stock representations are surfaced rather than silently selected.

## Current validation status

The repository uses GitHub Actions for TypeScript checks, frontend syntax checks and the full workspace test suite. The current implementation includes regression coverage for market intelligence, strategy construction, portfolio/risk checks, transaction review, execution gating, baskets, homepage architecture, SDK behavior, Telegram handling and workspace resilience.

## Hackathon direction

Handelo is being built for the BNB Hack: Tokenized Stocks Edition with BSC mainnet tokenized-stock infrastructure at the center of the product. Final deployment, live demo evidence, demo video and submission packaging remain separate final-stage work.
