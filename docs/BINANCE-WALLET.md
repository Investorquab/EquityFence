# Binance Wallet Exposure

EquityFence can now resolve token exposure through Binance Web3 Wallet API instead of relying only on a direct RPC call.

The adapter queries the specific wallet/token pair on BSC and returns the raw token balance needed by the deterministic exposure engine.

The Binance Wallet API documents the token-balance endpoint as:
POST /api/v1/dex/balance/token-balances-by-address

It accepts a wallet address plus token contract/chain pairs and returns raw token balances. API authentication is signed and supports the anti-replay nonce header.

A missing raw balance is treated as an error, not zero exposure. This preserves the fail-closed safety rule.
