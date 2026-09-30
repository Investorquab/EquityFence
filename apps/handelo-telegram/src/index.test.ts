import test from "node:test";
import assert from "node:assert/strict";
import { createTelegramHandler, formatHandeloResponse } from "./index.js";

test("Telegram formatter renders structured Handelo context", () => {
  const text = formatHandeloResponse({
    answer: "NVIDIA has a live tokenized representation.",
    market: {
      tokenSymbol: "NVDAB",
      provider: "Binance",
      tokenPrice: "180",
      referencePrice: "175",
      premiumPct: 2.857,
      marketStatus: "OPEN",
    },
    strategy: {
      type: "DCA",
      asset: "NVDAB",
      amountUsd: 10,
      frequency: "Every Monday",
      status: "DRAFT",
    },
    policy: { decision: "PASS", reason: "Policy checks passed." },
    basket: { name: "AI basket", assets: ["NVDAB", "MSFTB"] },
  });

  assert.match(text, /MARKET INSIGHT/);
  assert.match(text, /STRATEGY PREVIEW/);
  assert.match(text, /RISK RESULT/);
  assert.match(text, /BASKET PREVIEW/);
  assert.match(text, /No strategy is activated by Telegram/);
});

test("Telegram ignores group messages", async () => {
  const calls: string[] = [];
  const client = {
    chat: async () => {
      throw new Error("should not be called");
    },
  };
  const transport = {
    call: async (method: string) => {
      calls.push(method);
      return {};
    },
  };

  await createTelegramHandler(client, transport)({
    update_id: 1,
    message: { chat: { id: 7, type: "group" }, text: "hello" },
  });

  assert.deepEqual(calls, []);
});

test("Telegram /start and /help are handled without the LLM", async () => {
  const messages: string[] = [];
  const client = { chat: async () => ({ answer: "unused" }) };
  const transport = {
    call: async (_method: string, body?: Record<string, unknown>) => {
      messages.push(String(body?.text ?? ""));
      return {};
    },
  };
  const handler = createTelegramHandler(client, transport);

  await handler({ update_id: 1, message: { chat: { id: 1, type: "private" }, text: "/start" } });
  await handler({ update_id: 2, message: { chat: { id: 1, type: "private" }, text: "/help" } });

  assert.match(messages[0], /Welcome to Handelo/);
  assert.match(messages[1], /Telegram does not hold private keys/);
});
