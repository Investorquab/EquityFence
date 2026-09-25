# Binance RWA Integration

EquityFence now has a concrete adapter from Binance Web3 RWA Data API into the internal state-source boundary.

The adapter:

1. searches Binance RWA data by token contract address;
2. restricts the match to BSC (chain 56);
3. resolves the matching platform;
4. fetches the full RWA token record;
5. exposes it to the state engine without coupling the risk engine to Binance.

API credentials must remain outside the repository. Use environment variables locally; never commit the API secret.
