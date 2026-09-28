# Handelo

**The agent that understands the market for the user, rather than simply trading for the user.**

Handelo is an AI-native interface for tokenized stocks on BNB Smart Chain. It is designed for people who may know what they want to invest in without knowing the mechanics underneath: market hours, reference prices, on-chain prices, tokenized representations, and execution conditions.

## Current architecture

```
User
  ↓
Handelo Agent
  ├── Intent understanding
  ├── Live tokenized-stock market intelligence
  ├── Reference vs on-chain price context
  └── Explanation
       ↓
BNB Chain / Binance Web3 infrastructure
```

## First working slice

The repository now contains a provider-agnostic LLM layer, a live Binance Web3 tokenized-stock market client, and a Handelo agent API.

The agent accepts a normal-language request, resolves the relevant BSC tokenized-stock record, or discovers live BSC candidates when the user has not named a stock, and explains the market state using live data.\n\nPortfolio data is exposed through `GET /api/portfolio?wallet=...` and the developer surface is available through the read-only Handelo MCP server and `@handelo/sdk`.

## AI provider

Set one key:

- `HANDELO_API_KEY=...` (or `API_KEY=...`)

Handelo recognizes Groq, OpenAI, and Anthropic keys automatically and chooses a hardcoded supported model for the detected provider. No model dropdown is required.

The current Groq path uses `openai/gpt-oss-120b`.

## Binance Web3

Set:

- `BINANCE_WEB3_API_KEY=...`
- `BINANCE_WEB3_SECRET_KEY=...`

Do not commit secrets.

## Run the agent

```bash
pnpm install
pnpm --filter @handelo/api dev
```

Then:

```bash
curl -X POST http://localhost:8787/api/chat \
  -H "content-type: application/json" \
  -d '{"message":"I have $20. Tell me what is happening with NVIDIA."}'
```

## Build direction

Handelo will grow in this order:

1. market intelligence
2. portfolio understanding\n3. market discovery and candidate analysis
4. decision and safety layer
5. real BSC execution
6. agent wallet integration
7. MCP and SDK
8. Telegram
9. premium web product and storytelling landing page
10. live demo and developer-experience documentation

The legacy EquityFence modules are being audited and replaced selectively rather than carried forward as a separate product.

## Security principle

The language model does not receive private keys. AI decides *what the user is asking* and *what market context means*; deterministic application code and the wallet/execution layer remain responsible for transaction construction, policy checks, signing, and verification.


## Representation safety

A stock ticker can have multiple tokenized representations on BSC. Handelo does not silently choose a venue when the request is ambiguous. It exposes the live representations and their market context first; an exact token symbol such as a provider-qualified symbol can be resolved directly.
