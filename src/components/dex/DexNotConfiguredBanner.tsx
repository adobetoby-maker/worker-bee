import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function DexNotConfiguredBanner() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>DEX not configured for this chain</AlertTitle>
      <AlertDescription>
        Router, factory, and wrapped-native contract addresses are not yet set. Fill them in at{" "}
        <code className="font-mono text-xs">src/lib/dex/config.ts</code> and reload to enable swaps.
      </AlertDescription>
    </Alert>
  );
}
