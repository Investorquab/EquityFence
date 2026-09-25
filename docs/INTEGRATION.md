# EquityFence Integration Layer

The integration layer joins the three independent MVP boundaries:

1. RWA state source — supplies current tokenized-equity state.
2. Exposure source — verifies the wallet's on-chain ERC-20 balance.
3. Risk engine — converts the observed transition and exposure into ALLOW or BLOCK.

It deliberately does not submit transactions.

If exposure lookup throws, the condition becomes unknown exposure and the risk engine fails closed with BLOCK.

The next stage is transaction simulation, not execution.
