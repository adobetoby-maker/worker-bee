import { useEffect, useRef, useState } from "react";

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
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      let nextDelay = ACTIVE_INTERVAL;
      try {
        const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/ps`);
        if (!res.ok) throw new Error(`http ${res.status}`);
        const data = (await res.json()) as { models?: PsModel[] };
        const models = data.models ?? [];
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
        if (cancelled) return;
        setSnap(next);

        // Notify on real changes only
        const sig = `${next.status}|${ramGb}|${vramGb}|${models.map((m) => m.name).join(",")}`;
        if (sig !== lastSigRef.current) {
          lastSigRef.current = sig;
          onChange?.(next);
        }

        // Expiry soon checks
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
        // Reset warning once model is no longer expiring soon (e.g., kept alive)
        for (const name of Array.from(warnedRef.current)) {
          if (!stillExpiring.has(name)) warnedRef.current.delete(name);
        }
      } catch {
        if (cancelled) return;
        const next: PsSnapshot = {
          status: "unreachable",
          ramGb: 0,
          vramGb: 0,
          models: [],
          fetchedAt: Date.now(),
        };
        setSnap(next);
        if (lastSigRef.current !== "unreachable") {
          lastSigRef.current = "unreachable";
          onChange?.(next);
        }
        nextDelay = FAILURE_INTERVAL;
      } finally {
        if (!cancelled) timer = setTimeout(tick, nextDelay);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [endpoint, enabled, onChange, onExpirySoon]);

  return snap;
}
