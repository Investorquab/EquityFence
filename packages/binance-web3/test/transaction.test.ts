import test from "node:test";
import assert from "node:assert/strict";
import { BinanceTransactionClient } from "../src/transaction.ts";

test("requires Binance API credentials", () => {
  assert.throws(
    () => new BinanceTransactionClient({ apiKey: "", secretKey: "" }),
    /credentials are required/,
  );
});

test("constructs a transaction client with credentials", () => {
  const client = new BinanceTransactionClient({
    apiKey: "test-key",
    secretKey: "test-secret",
  });
  assert.ok(client);
});
