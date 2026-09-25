# Transaction Simulation

EquityFence uses the Binance Web3 Transaction API simulation endpoint as the pre-execution boundary.

The current adapter targets BSC (binanceChainId "56") and EVM transactions.

Request:
- binanceChainId
- evmTx.from
- evmTx.to
- evmTx.value
- optional evmTx.data

The response exposes predicted execution status, failure reason, token balance changes, and ERC-20 allowance changes.

The Binance API requires HMAC-SHA256 authentication. For POST requests the signature pre-hash is:

timestamp + method + /build-prefixed request path + raw request body.

The adapter does not broadcast transactions. Simulation must happen before any future broadcast path.
