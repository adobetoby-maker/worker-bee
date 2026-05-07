import { defineChain } from "viem";

const DEFAULT_RPC = "http://rpc.trustedsmartchain.com:8545";

const rpcUrl =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: { VITE_TSC_RPC_URL?: string } }).env?.VITE_TSC_RPC_URL) ||
  DEFAULT_RPC;

export const TSC_CHAIN_ID = 87878;

export const tscChain = defineChain({
  id: TSC_CHAIN_ID,
  name: "Trusted Smart Chain",
  nativeCurrency: { name: "TSC", symbol: "TSC", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "TSC Explorer", url: "https://api.tsc.sh" },
  },
  testnet: false,
});

export const tscRpcUrl = rpcUrl;
