import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { tscChain, tscRpcUrl } from "./chain";

const PLACEHOLDER_PROJECT_ID = "00000000000000000000000000000000";

const envProjectId =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: { VITE_WC_PROJECT_ID?: string } }).env
      ?.VITE_WC_PROJECT_ID) ||
  "";

const projectId = envProjectId || PLACEHOLDER_PROJECT_ID;

if (!envProjectId && typeof window !== "undefined") {
  console.warn(
    "[worker-bee] VITE_WC_PROJECT_ID is not set. WalletConnect mobile pairings " +
      "will fail. Get a free project ID at https://cloud.reown.com and add it to .env",
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Worker Bee DEX",
  projectId,
  chains: [tscChain],
  transports: {
    [tscChain.id]: http(tscRpcUrl),
  },
  ssr: true,
});

export const isWalletConnectConfigured = Boolean(envProjectId);
