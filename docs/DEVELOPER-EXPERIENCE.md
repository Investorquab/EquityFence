# Handelo Developer Experience Report

This document is a living record for the BNB Tokenized Stocks hackathon.

## What a developer gets

### SDK
`@handelo/sdk` exposes a small client surface for sending natural-language requests to a Handelo runtime.

### MCP
`@handelo/mcp` exposes read-only tokenized-stock market tools for MCP-compatible developer environments.

### Market data
The market package isolates Binance Web3 authentication and normalizes tokenized-stock records for the agent.

### Policy
The policy package is deterministic and independent of the LLM provider.

## Environment

```
HANDELO_API_KEY=
BINANCE_WEB3_API_KEY=
BINANCE_WEB3_SECRET_KEY=
HANDELO_WALLET=
BSC_RPC_URL=
```

No private key or wallet password belongs in these variables.

## Important architectural boundary

MCP is read-only. Transaction signing is not an MCP tool.

The secured wallet layer is responsible for authorization and signing, while Handelo is responsible for intent, market context, policy, and verification.

## Planned developer journey

1. Clone repository.
2. Install dependencies.
3. Configure one AI provider key and Binance Web3 credentials.
4. Run the Handelo API.
5. Ask a natural-language market question.
6. Connect MCP to an IDE.
7. Review the execution boundary.
8. Run the live demo with controlled funds.

The report will be expanded after the first complete local end-to-end test.
