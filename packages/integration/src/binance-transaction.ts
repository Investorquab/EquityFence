import { BinanceTransactionClient } from "@equityfence/binance-web3";
import type { EvmTransaction, SimulationResult } from "@equityfence/binance-web3";
import type { SimulationSource } from "./model.js";

export class BinanceSimulationSource implements SimulationSource {
  constructor(private readonly client: BinanceTransactionClient) {}

  simulateTransaction(request: {
    binanceChainId: string;
    evmTx: EvmTransaction;
  }): Promise<SimulationResult> {
    return this.client.simulateTransaction(request);
  }
}
