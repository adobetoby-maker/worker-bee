import type { Address } from "viem";
import { TSC_CHAIN_ID } from "@/lib/web3/chain";

export interface DexAddresses {
  router: Address | null;
  factory: Address | null;
  wnative: Address | null;
}

const ZERO: DexAddresses = { router: null, factory: null, wnative: null };

export const DEX_ADDRESSES: Record<number, DexAddresses> = {
  [TSC_CHAIN_ID]: ZERO,
};

export function getDexAddresses(chainId: number | undefined): DexAddresses {
  if (chainId === undefined) return ZERO;
  return DEX_ADDRESSES[chainId] ?? ZERO;
}

export function isDexConfigured(chainId: number | undefined): boolean {
  const a = getDexAddresses(chainId);
  return Boolean(a.router && a.factory && a.wnative);
}

export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_SECONDS = 60 * 20;
