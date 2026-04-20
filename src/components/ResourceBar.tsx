import type { ResourceEstimate } from "@/lib/resource-estimate";

interface Props {
  resources: ResourceEstimate;
}

function colorFor(pct: number) {
  if (pct >= 80) return { fill: "#ff3b3b", pulse: true };
  if (pct >= 60) return { fill: "#ffaa00", pulse: false };
  return { fill: "#39ff14", pulse: false };
}

function Pill({
  icon,
  label,
  used,
  total,
  unit,
  pct,
}: {
  icon: string;
  label: string;
  used: string;
  total?: string;
  unit?: string;
  pct: number;
}) {
  const { fill, pulse } = colorFor(pct);
  const segs = 8;
  const filled = Math.round((pct / 100) * segs);
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap">
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-foreground/80">{label}</span>
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
      <span className="text-foreground/80 normal-case tracking-normal">
        {used}
        {total ? ` / ${total}` : ""}
        {unit ?? ""}
      </span>
      <span className="text-[9px]" style={{ color: "#444" }}>
        (estimated)
      </span>
    </div>
  );
}

export function ResourceBar({ resources }: Props) {
  const { ramUsed, ramTotal, vramUsed, vramTotal, cpuPct } = resources;
  const ramPct = (ramUsed / ramTotal) * 100;
  const vramPct = (vramUsed / vramTotal) * 100;
  return (
    <div
      className="flex items-center gap-6 px-4 overflow-x-auto"
      style={{
        height: 32,
        background: "#070707",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      <Pill
        icon="🧠"
        label="RAM"
        used={ramUsed.toFixed(1)}
        total={`${ramTotal}`}
        unit=" GB"
        pct={ramPct}
      />
      <Pill
        icon="⚡"
        label="VRAM"
        used={vramUsed.toFixed(1)}
        total={`${vramTotal}`}
        unit=" GB"
        pct={vramPct}
      />
      <Pill icon="🔥" label="CPU" used={`${Math.round(cpuPct)}%`} pct={cpuPct} />
    </div>
  );
}
