import { probeEndpointViaWS } from "@/lib/agent-ws";

const ENDPOINT_KEY = "workerbee_endpoint";
const MODE_KEY = "workerbee_endpoint_mode";

export type EndpointMode = "http" | "https" | "tailscale" | "custom";

export const FALLBACK_ENDPOINTS: { url: string; mode: EndpointMode }[] = [
  { url: "https://localhost:8000", mode: "https" },
  { url: "http://localhost:8000", mode: "http" },
  { url: "http://localhost:11434", mode: "http" },
];

export function loadSavedEndpoint(): { url: string | null; mode: EndpointMode | null } {
  if (typeof window === "undefined") return { url: null, mode: null };
  try {
    const url = window.localStorage.getItem(ENDPOINT_KEY);
    const mode = window.localStorage.getItem(MODE_KEY) as EndpointMode | null;
    return { url: url || null, mode: mode || null };
  } catch {
    return { url: null, mode: null };
  }
}

export function saveEndpoint(url: string, mode: EndpointMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENDPOINT_KEY, url);
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function hasEverConnected(): boolean {
  if (typeof window === "undefined") return true; // assume yes on SSR
  try {
    return window.localStorage.getItem(ENDPOINT_KEY) !== null;
  } catch {
    return true;
  }
}

async function probe(url: string, timeoutMs = 3000): Promise<boolean> {
  // Routed through WebSocket — Chrome blocks http://localhost fetches from
  // an https page as mixed content, but the WebSocket handshake is allowed.
  return probeEndpointViaWS(url, timeoutMs);
}

/**
 * Tries the saved endpoint first, then the fallback list.
 * Returns the first endpoint that responds to GET /health within 3s.
 */
export async function autoDiscoverEndpoint(): Promise<
  { url: string; mode: EndpointMode } | null
> {
  const saved = loadSavedEndpoint();
  const tried = new Set<string>();
  const candidates: { url: string; mode: EndpointMode }[] = [];
  if (saved.url) {
    candidates.push({ url: saved.url, mode: saved.mode ?? "custom" });
  }
  for (const c of FALLBACK_ENDPOINTS) candidates.push(c);

  for (const c of candidates) {
    if (tried.has(c.url)) continue;
    tried.add(c.url);
    const ok = await probe(c.url);
    if (ok) return c;
  }
  return null;
}

export const INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/adobetoby-maker/workerbee-ai/refs/heads/main/mac-install.sh | zsh";

export type AutoConnectStatus = "idle" | "trying" | "connected" | "failed" | "reconnecting";
