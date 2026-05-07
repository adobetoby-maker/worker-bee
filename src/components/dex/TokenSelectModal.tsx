import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { TokenInfo } from "@/lib/dex/tokens";
import { useState } from "react";

interface Props {
  selected: TokenInfo;
  tokens: TokenInfo[];
  onSelect: (token: TokenInfo) => void;
  disabledAddress?: TokenInfo["address"];
}

export function TokenSelectModal({ selected, tokens, onSelect, disabledAddress }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1">
          {selected.symbol}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {tokens.length === 0 && (
            <p className="text-sm text-muted-foreground">No tokens available on this chain.</p>
          )}
          {tokens.map((t) => {
            const disabled = t.address === disabledAddress;
            return (
              <button
                key={`${t.chainId}-${String(t.address)}`}
                type="button"
                disabled={disabled}
                className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-left hover:border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{t.symbol}</span>
                  <span className="text-xs text-muted-foreground">{t.name}</span>
                </div>
                {t.address !== "native" && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {`${t.address.slice(0, 6)}…${t.address.slice(-4)}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
