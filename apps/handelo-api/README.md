# Handelo API

The first Handelo agent runtime.

## Environment

Set:
- `HANDELO_API_KEY` (or `API_KEY`) — a Groq, OpenAI, or Anthropic API key.
- `BINANCE_WEB3_API_KEY`
- `BINANCE_WEB3_SECRET_KEY`

No provider/model selection is required. Handelo detects the provider from the key and uses a tested model for that provider.

## Run

```bash
pnpm --filter @handelo/api dev
```

Health: `GET /health`

Agent: `POST /api/chat`

```json
{"message":"I have $20. Tell me what is happening with NVIDIA."}
```

The agent resolves live BSC tokenized-stock data before explaining the market when a ticker is present.
