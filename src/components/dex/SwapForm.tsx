import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { formatUnits, maxUint256, parseUnits, type Address } from "viem";
import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { TokenSelectModal } from "./TokenSelectModal";
import { DexNotConfiguredBanner } from "./DexNotConfiguredBanner";
import { isNative, NATIVE_TOKEN, tokensForChain, type TokenInfo } from "@/lib/dex/tokens";
import {
  DEFAULT_DEADLINE_SECONDS,
  DEFAULT_SLIPPAGE_BPS,
  getDexAddresses,
  isDexConfigured,
} from "@/lib/dex/config";
import { applySlippage, buildPath, getQuote } from "@/lib/dex/quote";
import { erc20Abi, uniswapV2RouterAbi } from "@/lib/dex/abis";
import { TSC_CHAIN_ID } from "@/lib/web3/chain";

const QUOTE_DEBOUNCE_MS = 350;

export function SwapForm() {
  const chainId = useChainId();
  const account = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const tokens = useMemo(() => tokensForChain(chainId ?? TSC_CHAIN_ID), [chainId]);
  const [tokenIn, setTokenIn] = useState<TokenInfo>(tokens[0] ?? NATIVE_TOKEN);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(tokens[1] ?? null);
  const [amountIn, setAmountIn] = useState("");
  const [quoteOut, setQuoteOut] = useState<bigint | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!tokens.find((t) => t.symbol === tokenIn.symbol)) {
      setTokenIn(tokens[0] ?? NATIVE_TOKEN);
    }
    if (tokenOut && !tokens.find((t) => t.symbol === tokenOut.symbol)) {
      setTokenOut(tokens.find((t) => t.symbol !== tokenIn.symbol) ?? null);
    }
  }, [tokens, tokenIn.symbol, tokenOut]);

  const dexConfigured = isDexConfigured(chainId);
  const dexAddresses = getDexAddresses(chainId);

  const balanceIn = useBalance({
    address: account.address,
    token: isNative(tokenIn) ? undefined : (tokenIn.address as Address),
    chainId,
    query: { enabled: Boolean(account.address) },
  });

  const parsedAmountIn = useMemo(() => {
    if (!amountIn) return 0n;
    try {
      return parseUnits(amountIn, tokenIn.decimals);
    } catch {
      return 0n;
    }
  }, [amountIn, tokenIn.decimals]);

  useEffect(() => {
    if (!publicClient || !tokenOut || parsedAmountIn === 0n || !dexConfigured) {
      setQuoteOut(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const id = setTimeout(async () => {
      const q = await getQuote({
        client: publicClient,
        chainId: chainId!,
        amountIn: parsedAmountIn,
        tokenIn,
        tokenOut,
      });
      if (cancelled) return;
      setQuoteOut(q?.amountOut ?? null);
      setQuoting(false);
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [publicClient, parsedAmountIn, tokenIn, tokenOut, chainId, dexConfigured]);

  useEffect(() => {
    if (!publicClient || !account.address || !dexAddresses.router || isNative(tokenIn)) {
      setAllowance(null);
      return;
    }
    let cancelled = false;
    publicClient
      .readContract({
        address: tokenIn.address as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account.address, dexAddresses.router],
      })
      .then((v) => {
        if (!cancelled) setAllowance(v as bigint);
      })
      .catch(() => {
        if (!cancelled) setAllowance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, account.address, dexAddresses.router, tokenIn]);

  const needsApproval =
    !isNative(tokenIn) && parsedAmountIn > 0n && allowance !== null && allowance < parsedAmountIn;

  function flip() {
    if (!tokenOut) return;
    const newIn = tokenOut;
    const newOut = tokenIn;
    setTokenIn(newIn);
    setTokenOut(newOut);
    setAmountIn("");
    setQuoteOut(null);
  }

  async function handleApprove() {
    if (!dexAddresses.router || isNative(tokenIn)) return;
    setError(null);
    try {
      await writeContractAsync({
        address: tokenIn.address as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [dexAddresses.router, maxUint256],
      });
      setAllowance(maxUint256);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    }
  }

  async function handleSwap() {
    if (!dexAddresses.router || !dexAddresses.wnative || !tokenOut || !account.address) return;
    if (parsedAmountIn === 0n || quoteOut === null) return;
    setError(null);

    const path = buildPath(tokenIn, tokenOut, dexAddresses.wnative);
    const minOut = applySlippage(quoteOut, DEFAULT_SLIPPAGE_BPS);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);

    try {
      if (isNative(tokenIn)) {
        await writeContractAsync({
          address: dexAddresses.router,
          abi: uniswapV2RouterAbi,
          functionName: "swapExactETHForTokens",
          args: [minOut, path, account.address, deadline],
          value: parsedAmountIn,
        });
      } else if (isNative(tokenOut)) {
        await writeContractAsync({
          address: dexAddresses.router,
          abi: uniswapV2RouterAbi,
          functionName: "swapExactTokensForETH",
          args: [parsedAmountIn, minOut, path, account.address, deadline],
        });
      } else {
        await writeContractAsync({
          address: dexAddresses.router,
          abi: uniswapV2RouterAbi,
          functionName: "swapExactTokensForTokens",
          args: [parsedAmountIn, minOut, path, account.address, deadline],
        });
      }
      setAmountIn("");
      setQuoteOut(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed");
    }
  }

  const insufficientBalance = balanceIn.data && parsedAmountIn > balanceIn.data.value;

  const canSwap =
    dexConfigured &&
    Boolean(account.address) &&
    Boolean(tokenOut) &&
    parsedAmountIn > 0n &&
    quoteOut !== null &&
    !insufficientBalance &&
    !needsApproval;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-3 p-4">
        {!dexConfigured && <DexNotConfiguredBanner />}

        <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>You pay</span>
            {balanceIn.data && (
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => setAmountIn(formatUnits(balanceIn.data!.value, tokenIn.decimals))}
              >
                Balance: {Number(formatUnits(balanceIn.data.value, tokenIn.decimals)).toFixed(4)}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value.replace(/[^0-9.]/g, ""))}
              className="border-0 bg-transparent px-0 text-2xl shadow-none focus-visible:ring-0"
            />
            <TokenSelectModal
              selected={tokenIn}
              tokens={tokens}
              onSelect={setTokenIn}
              disabledAddress={tokenOut?.address}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" size="icon" onClick={flip} disabled={!tokenOut}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">You receive</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate text-2xl">
              {quoting ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : quoteOut !== null && tokenOut ? (
                Number(formatUnits(quoteOut, tokenOut.decimals)).toFixed(6)
              ) : (
                <span className="text-muted-foreground">0.0</span>
              )}
            </div>
            {tokenOut ? (
              <TokenSelectModal
                selected={tokenOut}
                tokens={tokens}
                onSelect={setTokenOut}
                disabledAddress={tokenIn.address}
              />
            ) : (
              <span className="text-xs text-muted-foreground">No token</span>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {!account.address ? (
          <Button disabled className="w-full">
            Connect a wallet to swap
          </Button>
        ) : insufficientBalance ? (
          <Button disabled className="w-full">
            Insufficient {tokenIn.symbol} balance
          </Button>
        ) : needsApproval ? (
          <Button onClick={handleApprove} disabled={isWritePending} className="w-full">
            {isWritePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Approve ${tokenIn.symbol}`
            )}
          </Button>
        ) : (
          <Button onClick={handleSwap} disabled={!canSwap || isWritePending} className="w-full">
            {isWritePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Swap"}
          </Button>
        )}

        <p className="text-center text-[10px] text-muted-foreground">
          Slippage {DEFAULT_SLIPPAGE_BPS / 100}% · Deadline {DEFAULT_DEADLINE_SECONDS / 60} min
        </p>
      </CardContent>
    </Card>
  );
}
