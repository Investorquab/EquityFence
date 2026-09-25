# Live EVM Exposure

EquityFence now has an EVM RPC-backed exposure source.

## What it does

For an ERC-20 token contract and wallet, it calls:

`eth_call` → `balanceOf(wallet)`

and returns the raw uint256 token balance.

The implementation keeps the raw balance as a decimal string so large token balances are never converted through JavaScript floating-point numbers.

## Why this is the next step

The exposure engine previously used a static source for deterministic tests. This package provides the network boundary needed to replace that fixture with an actual BNB-compatible RPC endpoint.

## Required runtime inputs

- BNB-compatible EVM RPC URL
- token contract address
- wallet address

No private key is required for reading balances.

## Limitation

The current implementation assumes 18 decimals in the returned exposure metadata. Before production use, token decimals must be fetched from the token contract or trusted asset metadata.

The safety engine must not treat an RPC failure as zero exposure. An unavailable balance should be an error/unknown state, not a safe state.
