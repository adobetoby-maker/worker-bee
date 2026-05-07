import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Web3Provider } from "@/lib/web3/Web3Provider";
import { SwapForm } from "@/components/dex/SwapForm";

export const Route = createFileRoute("/dex")({
  component: DexPage,
});

function DexPage() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Worker Bee
          </Link>
          <h1 className="text-base font-semibold">TSC DEX</h1>
          <ConnectButton showBalance chainStatus="icon" accountStatus="address" />
        </header>
        <main className="flex justify-center px-4 py-10">
          <SwapForm />
        </main>
      </div>
    </Web3Provider>
  );
}
