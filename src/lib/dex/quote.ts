import type { Address, PublicClient } from "viem";
import { uniswapV2RouterAbi } from "./abis";
import { isNative, type TokenInfo } from "./tokens";
import { getDexAddresses } from "./config";

export interface QuoteParams {
  client: PublicClient;
  chainId: number;
  amountIn: bigint;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
}

export interface Quote {
  amountOut: bigint;
  path: Address[];
}

export function buildPath(tokenIn: TokenInfo, tokenOut: TokenInfo, wnative: Address): Address[] {
  const a = isNative(tokenIn) ? wnative : (tokenIn.address as Address);
  const b = isNative(tokenOut) ? wnative : (tokenOut.address as Address);
  return [a, b];
}

export async function getQuote({
  client,
  chainId,
  amountIn,
  tokenIn,
  tokenOut,
}: QuoteParams): Promise<Quote | null> {
  const { router, wnative } = getDexAddresses(chainId);
  if (!router || !wnative || amountIn === 0n) return null;

  const path = buildPath(tokenIn, tokenOut, wnative);

  try {
    const amounts = (await client.readContract({
      address: router,
      abi: uniswapV2RouterAbi,
      functionName: "getAmountsOut",
      args: [amountIn, path],
    })) as bigint[];
    return { amountOut: amounts[amounts.length - 1], path };
  } catch {
    return null;
  }
}

export function applySlippage(amount: bigint, slippageBps: number): bigint {
  const numerator = BigInt(10_000 - slippageBps);
  return (amount * numerator) / 10_000n;
}
