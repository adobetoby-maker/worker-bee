import { useEffect, useRef, useState } from "react";
import { subscribePsViaWS } from "@/lib/agent-ws";

export interface PsModel {
  name: string;
  size: number;
  size_vram: number;
  expires_at?: string;
}

export interface PsSnapshot {
  status: "idle" | "live" | "unreachable";
  ramGb: number;
  vramGb: number;
  models: PsModel[];
  fetchedAt: number;
}

interface Options {
  endpoint: string;
  enabled: boolean;
  onChange?: (snap: PsSnapshot) => void;
  onExpirySoon?: (model: string, secondsLeft: number) => void;
}

const ACTIVE_INTERVAL = 8000;
const FAILURE_INTERVAL = 15000;

export function useOllamaPs({ endpoint, enabled, onChange, onExpirySoon }: Options): PsSnapshot {
  const [snap, setSnap] = useState<PsSnapshot>({
    status: "idle",
    ramGb: 0,
    vramGb: 0,
    models: [],
    fetchedAt: 0,
  });
  const lastSigRef = useRef<string>("");
  const warnedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    // Routed through WebSocket — Chrome blocks http fetches to localhost
    // from an https page as mixed content.
    let unreachableSince: number | null = null;
    const unsubscribe = subscribePsViaWS(endpoint, (payload) => {
      const models = payload.models ?? [];
      // If subscribePsViaWS returns an empty payload because the socket isn't
      // open, treat that as unreachable.
      const socketDown = models.length === 0 && unreachableSince === null;
      if (socketDown) {
        unreachableSince = Date.now();
      } else {
        unreachableSince = null;
      }
      const ramBytes = models.reduce((a, m) => a + (m.size ?? 0), 0);
      const vramBytes = models.reduce((a, m) => a + (m.size_vram ?? 0), 0);
      const ramGb = +(ramBytes / 1024 / 1024 / 1024).toFixed(1);
      const vramGb = +(vramBytes / 1024 / 1024 / 1024).toFixed(1);
      const next: PsSnapshot = {
        status: models.length === 0 ? "idle" : "live",
        ramGb,
        vramGb,
        models,
        fetchedAt: Date.now(),
      };
      setSnap(next);
      const sig = `${next.status}|${ramGb}|${vramGb}|${models.map((m) => m.name).join(",")}`;
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        onChange?.(next);
      }
      const now = Date.now();
      const stillExpiring = new Set<string>();
      for (const m of models) {
        if (!m.expires_at) continue;
        const ms = new Date(m.expires_at).getTime() - now;
        if (Number.isFinite(ms) && ms > 0 && ms < 60_000) {
          stillExpiring.add(m.name);
          if (!warnedRef.current.has(m.name)) {
            warnedRef.current.add(m.name);
            onExpirySoon?.(m.name, Math.ceil(ms / 1000));
          }
        }
      }
      for (const name of Array.from(warnedRef.current)) {
        if (!stillExpiring.has(name)) warnedRef.current.delete(name);
      }
    }, ACTIVE_INTERVAL);
    return () => unsubscribe();
  }, [endpoint, enabled, onChange, onExpirySoon]);

  return snap;
}
