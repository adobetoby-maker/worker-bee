import type { Address } from "viem";
import { TSC_CHAIN_ID } from "@/lib/web3/chain";

export interface TokenInfo {
  chainId: number;
  address: Address | "native";
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export const NATIVE_TOKEN: TokenInfo = {
  chainId: TSC_CHAIN_ID,
  address: "native",
  symbol: "TSC",
  name: "Trusted Smart Chain",
  decimals: 18,
};

export const TOKEN_LIST: TokenInfo[] = [NATIVE_TOKEN];

export function tokensForChain(chainId: number | undefined): TokenInfo[] {
  if (chainId === undefined) return [];
  return TOKEN_LIST.filter((t) => t.chainId === chainId);
}

export function isNative(token: TokenInfo): boolean {
  return token.address === "native";
}
