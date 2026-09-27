# EquityFence CLI

Runs the EquityFence safety pipeline against live Binance Web3 data.

Flow: live RWA state -> wallet exposure -> deterministic risk gate -> transaction simulation when ALLOW.

It never broadcasts a transaction.

Required: BINANCE_WEB3_API_KEY, BINANCE_WEB3_SECRET_KEY, EQUITYFENCE_ASSET_ID, EQUITYFENCE_WALLET, EQUITYFENCE_PREVIOUS_SNAPSHOT, EQUITYFENCE_TX_TO.

Optional: EQUITYFENCE_PLATFORM=ondo or bstock, EQUITYFENCE_ACTION=TRANSFER, EQUITYFENCE_TX_VALUE=0, EQUITYFENCE_TX_DATA=0x.

Run: pnpm --filter @equityfence/cli demo

The previous snapshot must match StateSnapshot. The CLI prints the current live snapshot so it can be saved as a future baseline.


## End-to-end showcase

Run:

```text
pnpm --filter @equityfence/cli showcase
```

The showcase runs two scenarios:

1. **Live safe path** — fetches the selected RWA asset and wallet exposure, evaluates the deterministic risk gate, and runs Binance transaction simulation when the gate returns ALLOW.
2. **Controlled blocked path** — replays an economic-state change with a known exposed position and verifies that the risk gate returns BLOCK before simulation.

The command fails if the live path does not finish with a successful simulation or if the blocked path does not return BLOCK.

The transaction is simulation-only; the showcase never broadcasts or executes it.
