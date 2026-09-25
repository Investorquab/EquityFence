# EquityFence Risk Engine

The risk engine is the deterministic policy boundary between economic-state detection and transaction execution.

## Decision policy

- **ALLOW** — no relevant economic-state transition is detected, or the affected asset has verified zero exposure.
- **BLOCK** — the wallet's exposure is unknown, or a relevant state transition affects a wallet with verified exposure.
- **WARN** is reserved for future non-blocking conditions. The MVP does not use WARN yet because the first safety path should be deterministic.

## Safety rule

The engine fails closed when exposure cannot be verified. An RPC failure or missing balance must never be interpreted as zero exposure.

## Scope

The engine does not fetch blockchain data, interpret provider APIs, or submit transactions. It receives normalized state-transition and exposure inputs so those concerns remain independently testable.
