# EquityFence Exposure Engine

The exposure layer answers a narrow question:

> Does this wallet currently hold a non-zero balance of the affected tokenized equity?

It deliberately does not infer economic value from a price feed and does not decide whether an action is safe.

## Current behavior

- Asset and wallet addresses are compared case-insensitively.
- Raw token balances are kept as strings to avoid floating-point precision loss.
- A position is considered exposed only when the matching raw balance is greater than zero.
- Unknown positions resolve to zero exposure.
- The first implementation uses a static source so the decision logic can be tested independently of RPC/network availability.

## Next integration

The static source will be replaced or supplemented by a real BNB-compatible balance source. That source must be connected before we claim the end-to-end safety flow is live.
