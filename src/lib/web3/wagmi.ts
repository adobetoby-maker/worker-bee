import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { tscChain, tscRpcUrl } from "./chain";

const projectId =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: { VITE_WC_PROJECT_ID?: string } }).env
      ?.VITE_WC_PROJECT_ID) ||
  "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Worker Bee DEX",
  projectId,
  chains: [tscChain],
  transports: {
    [tscChain.id]: http(tscRpcUrl),
  },
  ssr: true,
});
