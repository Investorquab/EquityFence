# EquityFence

**An equity circuit breaker for tokenized assets.**

EquityFence is protocol-side safety infrastructure for tokenized equities on BNB Chain. It detects relevant economic-state changes, evaluates whether a proposed DeFi action is affected, and returns a deterministic **ALLOW**, **WARN**, or **BLOCK** decision before execution.

## Core flow

```
Tokenized-equity state
        ↓
State analysis
        ↓
Exposure check
        ↓
Risk decision
        ↓
ALLOW / WARN / BLOCK
        ↓
Transaction simulation
        ↓
Execute only when permitted
```

## Current build scope

The first milestone is intentionally narrow:

1. Connect to real BNB/tokenized-equity data.
2. Represent the relevant economic state.
3. Detect a state transition.
4. Determine whether an exposed position is affected.
5. Produce a deterministic safety decision.
6. Simulate the proposed transaction.
7. Prove the ALLOW → BLOCK transition in a reproducible demo.

We are not building a trading bot, generic portfolio dashboard, oracle, lending protocol, tax engine, or generic corporate-action API.

## Status

Early implementation. The repository is being built incrementally with real integrations and tests rather than placeholder data.

## Product

**EquityFence**  
*An equity circuit breaker for tokenized assets.*
