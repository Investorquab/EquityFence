# Binance Web3 API Integration

EquityFence uses the Binance Web3 API as the initial tokenized-equity data source.

## Why this integration comes first

The hackathon provides an RWA Data API covering tokenized-stock platforms and a Transaction API for transaction simulation. At least one of bStocks, Ondo or xStocks must be central to the submission.

## Current client scope

`@equityfence/binance-web3` currently supports:

- Searching tokenized assets by ticker/company/contract address.
- Listing RWA tokens on BSC.
- Reading RWA token and underlying reference prices.

All authenticated requests use the Binance Web3 API HMAC-SHA256 signing scheme.

## Environment

Do not commit credentials.

```text
BINANCE_WEB3_API_KEY=
BINANCE_WEB3_SECRET_KEY=
```

The secret key must remain server-side.

## Important API behavior

The RWA token list exposes market state including:

- `openState`
- `marketStatus`
- `reasonCode`
- `reasonMsg`
- `nextOpenTime`
- `nextCloseTime`

The API also exposes `tokenToShareRatio`, token price and reference price. These are inputs to EquityFence's economic-state model, not themselves the final safety decision.

## Next integration

The next stage will connect this data source to the EquityFence state model and add a real position/exposure source. We will not treat a provider API response as proof that a transaction is safe by itself.
