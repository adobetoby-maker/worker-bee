import type { PsSnapshot } from "@/lib/use-ollama-ps";
import type { MachineProfile } from "@/lib/machine-profile";

interface Props {
  snap: PsSnapshot;
  profile: MachineProfile | null;
  /** Fallback totals when no profile saved. */
  fallback: { ramGb: number; vramGb: number };
}

function colorFor(pct: number) {
  if (pct >= 80) return { fill: "#ff3b3b", pulse: true };
  if (pct >= 60) return { fill: "#ffaa00", pulse: false };
  return { fill: "#39ff14", pulse: false };
}

function Bar({ pct }: { pct: number }) {
  const { fill, pulse } = colorFor(pct);
  const segs = 10;
  const filled = Math.max(0, Math.min(segs, Math.round((pct / 100) * segs)));
  return (
    <span
      className="inline-flex items-center"
      style={{ animation: pulse ? "pulse-neon 1.2s ease-in-out infinite" : undefined }}
    >
      <span className="text-muted-foreground">[</span>
      <span aria-hidden="true">
        {Array.from({ length: segs }).map((_, i) => (
          <span
            key={i}
            style={{
              color: i < filled ? fill : "#222",
              textShadow: i < filled && pulse ? `0 0 6px ${fill}` : undefined,
            }}
          >
            █
          </span>
        ))}
      </span>
      <span className="text-muted-foreground">]</span>
    </span>
  );
}

function LiveTag({ status }: { status: PsSnapshot["status"] }) {
  if (status === "unreachable") {
    return (
      <span className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: "#ffaa00" }}>
        ⚠ /api/ps unreachable
      </span>
    );
  }
  return (
    <span className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: "#39ff14" }}>
      (live)
    </span>
  );
}

export function ResourceBar({ snap, profile, fallback }: Props) {
  const totals = profile
    ? {
        ramGb: profile.ramGb,
        vramGb: profile.unified ? profile.ramGb : profile.vramGb,
        unified: profile.unified,
      }
    : { ramGb: fallback.ramGb, vramGb: fallback.vramGb, unified: false };

  const { status, ramGb, vramGb, models } = snap;
  const ramPct = totals.ramGb > 0 ? (ramGb / totals.ramGb) * 100 : 0;
  const vramPct = totals.vramGb > 0 ? (vramGb / totals.vramGb) * 100 : 0;

  const isUnreachable = status === "unreachable";
  const isIdle = status === "idle" && !isUnreachable;

  return (
    <div
      className="flex items-center gap-6 px-4 overflow-x-auto"
      style={{
        height: 32,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {isUnreachable ? (
        <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: "#ffaa00" }}>
          <span>⚠ /api/ps unreachable</span>
          <span className="text-[9px] text-muted-foreground">retrying every 15s</span>
        </div>
      ) : isIdle ? (
        <div className="flex items-center gap-3 font-mono text-[11px]" style={{ color: "#39ff14" }}>
          <span>🟢 No models loaded — Ollama idle</span>
          <LiveTag status={status} />
        </div>
      ) : (
        <>
          {/* RAM */}
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">
            <span className="text-sm leading-none">🧠</span>
            <span className="text-foreground/80">RAM</span>
            <Bar pct={ramPct} />
            <span className="text-foreground/80 normal-case tracking-normal">
              {ramGb.toFixed(1)} / {totals.ramGb} GB used
              {totals.unified ? " (unified)" : ""}
            </span>
            <LiveTag status={status} />
          </div>

          {/* VRAM (or unified note) */}
          {totals.vramGb > 0 ? (
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">
              <span className="text-sm leading-none">⚡</span>
              <span className="text-foreground/80">VRAM</span>
              <Bar pct={vramPct} />
              <span className="text-foreground/80 normal-case tracking-normal">
                {vramGb.toFixed(1)} / {totals.vramGb} GB used
                {totals.unified ? " (unified)" : ""}
              </span>
              <LiveTag status={status} />
            </div>
          ) : (
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">
              <span className="text-sm leading-none">⚡</span>
              <span className="text-foreground/60">VRAM</span>
              <span className="text-muted-foreground/60">— no discrete GPU</span>
              <LiveTag status={status} />
            </div>
          )}

          {/* Models */}
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">
            <span className="text-sm leading-none">🔥</span>
            <span className="text-foreground/80">MODELS</span>
            <span className="normal-case tracking-normal" style={{ color: "#39ff14" }}>
              {models.map((m) => m.name).join(" · ")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
