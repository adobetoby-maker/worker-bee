import { useEffect, useState } from "react";
import { getSkillsSnapshot, type Skill, type SkillsSnapshot, type FluencyTier } from "@/lib/skills/skills.functions";

const TIER_DOT: Record<FluencyTier, string> = {
  Beginner: "#ff6b6b",
  Practicing: "#ffaa00",
  Proficient: "#39ff14",
  Fluent: "#3b9eff",
};

export function CockpitSkillsRail() {
  const [snap, setSnap] = useState<SkillsSnapshot | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await getSkillsSnapshot();
        if (alive) setSnap(s);
      } catch { /* noop */ }
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const skills: Skill[] = snap?.skills ?? [];
  const filtered = filter
    ? skills.filter((s) =>
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.domain.toLowerCase().includes(filter.toLowerCase())
      )
    : skills;

  return (
    <div className="flex flex-col h-full font-mono text-[11px]">
      <div
        className="px-3 py-2 uppercase tracking-[0.2em] text-[9px] text-muted-foreground border-b"
        style={{ borderColor: "color-mix(in oklab, var(--border) 60%, transparent)" }}
      >
        // SKILLS · {skills.length}
      </div>
      <div className="px-2 py-2 border-b" style={{ borderColor: "color-mix(in oklab, var(--border) 50%, transparent)" }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter…"
          className="w-full px-2 py-1 rounded bg-transparent text-foreground placeholder:text-muted-foreground/60"
          style={{
            border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
            fontSize: 11,
          }}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-muted-foreground/70 text-center">No skills.</div>
        )}
        {filtered.map((s) => {
          const passPct = Math.round(s.passRateLast50 * 100);
          return (
            <div
              key={s.id}
              className="px-3 py-2 border-b hover:bg-surface/40 transition-colors"
              style={{
                borderColor: "color-mix(in oklab, var(--border) 35%, transparent)",
                animation: s.active ? "var(--animate-blink)" : undefined,
              }}
              title={s.description}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: TIER_DOT[s.tier] }}
                />
                <span className="truncate text-foreground/90">{s.name}</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-muted-foreground/70 text-[10px]">
                <span className="uppercase tracking-wider">{s.domain}</span>
                <span>
                  {s.iterations} · {passPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
