# EquityFence Build Notes

## First engineering milestone

Prove this path with real infrastructure:

**BNB/tokenized-equity data → economic state → state transition → affected exposure → deterministic decision → transaction simulation.**

The safety decision must remain deterministic. AI is not required for the core decision engine.

## Decisions

- Work directly on `main`.
- Keep the first implementation narrow.
- Prefer real integrations over fake demo data.
- Use replay fixtures only where a live state transition cannot be safely reproduced.
- Test each stage before moving to the next.

## Demo target

A normal transaction should produce **ALLOW**.

After a relevant economic-state transition, the same affected action should produce **BLOCK**, with a human-readable reason and evidence.
