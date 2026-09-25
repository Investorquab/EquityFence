import assert from "node:assert/strict";
import test from "node:test";
import {
  Erc20ExposureSource,
  type EvmRpcTransport,
} from "../src/erc20.js";

class FakeTransport implements EvmRpcTransport {
  constructor(private readonly result: string) {}

  async request<T>(_method: string, _params: unknown[]): Promise<T> {
    return this.result as T;
  }
}

test("reads an ERC-20 balance through eth_call", async () => {
  const source = new Erc20ExposureSource(
    new FakeTransport("0x00000000000000000000000000000000000000000000000000000000002386f0"),
  );

  const result = await source.getTokenBalance(
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
  );

  assert.equal(result.rawBalance, "2328304");
  assert.equal(result.decimals, 18);
});

test("rejects invalid wallet addresses before RPC execution", async () => {
  const source = new Erc20ExposureSource(
    new FakeTransport("0x0"),
  );

  await assert.rejects(
    source.getTokenBalance(
      "0x1111111111111111111111111111111111111111",
      "not-an-address",
    ),
    /Invalid EVM wallet address/,
  );
});
