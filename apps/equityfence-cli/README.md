# EquityFence CLI

Runs the EquityFence safety pipeline against live Binance Web3 data.

Flow: live RWA state -> wallet exposure -> deterministic risk gate -> transaction simulation when ALLOW.

It never broadcasts a transaction.

Required: BINANCE_WEB3_API_KEY, BINANCE_WEB3_SECRET_KEY, EQUITYFENCE_ASSET_ID, EQUITYFENCE_WALLET, EQUITYFENCE_PREVIOUS_SNAPSHOT, EQUITYFENCE_TX_TO.

Optional: EQUITYFENCE_PLATFORM=ondo or bstock, EQUITYFENCE_ACTION=TRANSFER, EQUITYFENCE_TX_VALUE=0, EQUITYFENCE_TX_DATA=0x.

Run: pnpm --filter @equityfence/cli demo

The previous snapshot must match StateSnapshot. The CLI prints the current live snapshot so it can be saved as a future baseline.
