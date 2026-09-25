# EquityFence State Engine

The state engine converts provider observations into a normalized EquityFence state and detects changes that may invalidate an existing DeFi action.

## State inputs

The first model tracks:

- provider
- asset
- multiplier
- token-to-share ratio
- market status
- whether the asset is open
- provider reason code
- observation time

## Transition behavior

A transition is reported when any safety-relevant field changes.

The engine does not decide whether the resulting transaction is safe. It only answers:

> Did the economic or market state relevant to this asset change, and why?

The risk engine remains responsible for the ALLOW/WARN/BLOCK decision.

## Design constraint

Provider data is treated as an observation, not as an automatic safety verdict. A later stage will combine state transitions with wallet exposure and transaction intent.
