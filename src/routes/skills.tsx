import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getSkillsSnapshot,
  type Domain,
  type FluencyTier,
  type Skill,
  type SkillsSnapshot,
} from "@/lib/skills/skills.functions";

export const Route = createFileRoute("/skills")({
  loader: () => getSkillsSnapshot(),
  component: SkillsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 font-mono text-sm text-foreground">
        <p className="mb-3">Failed to load skills: {error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="px-3 py-1 border border-border rounded"
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Skills not found.</div>,
});

const TIER_COLOR: Record<FluencyTier, string> = {
  Beginner: "text-red-300 bg-red-500/15 border-red-500/40",
  Practicing: "text-yellow-200 bg-yellow-500/15 border-yellow-500/40",
  Proficient: "text-green-300 bg-green-500/15 border-green-500/40",
  Fluent: "text-blue-300 bg-blue-500/15 border-blue-500/40",
};

const ALL_TIERS: FluencyTier[] = ["Beginner", "Practicing", "Proficient", "Fluent"];

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function SkillsPage() {
  const initial = Route.useLoaderData() as SkillsSnapshot;
  const [snap, setSnap] = useState<SkillsSnapshot>(initial);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<FluencyTier | "all">("all");
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [recentOnly, setRecentOnly] = useState(false);
  const [selected, setSelected] = useState<Skill | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const next = await getSkillsSnapshot();
        if (!cancelled) setSnap(next);
      } catch {
        /* swallow */
      }
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const domains = useMemo(() => {
    const s = new Set<Domain>();
    snap.skills.forEach((sk) => s.add(sk.domain));
    return Array.from(s).sort();
  }, [snap.skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 14;
    return snap.skills.filter((sk) => {
      if (tier !== "all" && sk.tier !== tier) return false;
      if (domain !== "all" && sk.domain !== domain) return false;
      if (recentOnly && new Date(sk.addedAt).getTime() < recentCutoff) return false;
      if (q && !(`${sk.name} ${sk.description} ${sk.domain}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [snap.skills, query, tier, domain, recentOnly]);

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        <header className="mb-4">
          <h1 className="text-xl md:text-2xl uppercase tracking-[0.2em] text-success">
            🧠 Skills
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {snap.skills.length} skills tracked · updated {timeAgo(snap.generatedAt)}
          </p>
        </header>

        {/* Filters */}
        <div
          className="rounded border p-3 mb-4 flex flex-col gap-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="w-full px-3 py-2 rounded border bg-background text-sm"
            style={{ borderColor: "var(--border)" }}
          />
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-muted-foreground uppercase tracking-[0.16em]">Tier:</span>
            <FilterChip active={tier === "all"} onClick={() => setTier("all")}>
              All
            </FilterChip>
            {ALL_TIERS.map((t) => (
              <FilterChip key={t} active={tier === t} onClick={() => setTier(t)}>
                {t}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-muted-foreground uppercase tracking-[0.16em]">Domain:</span>
            <FilterChip active={domain === "all"} onClick={() => setDomain("all")}>
              All
            </FilterChip>
            {domains.map((d) => (
              <FilterChip key={d} active={domain === d} onClick={() => setDomain(d)}>
                {d}
              </FilterChip>
            ))}
            <span className="ml-auto" />
            <FilterChip active={recentOnly} onClick={() => setRecentOnly((v) => !v)}>
              Recently added
            </FilterChip>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((sk) => (
            <button
              key={sk.id}
              onClick={() => setSelected(sk)}
              className="text-left rounded border p-3 hover:border-primary/60 transition-colors"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{sk.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {sk.description}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded border text-[10px] uppercase tracking-[0.12em] ${TIER_COLOR[sk.tier]}`}
                >
                  {sk.tier}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <Stat label="Iterations" value={`${sk.iterations.toLocaleString()}/${sk.iterationGoal.toLocaleString()}`} />
                <Stat label="Pass rate" value={`${Math.round(sk.passRateLast50 * 100)}%`} />
                <Stat label="Last run" value={timeAgo(sk.lastPracticedAt)} />
              </div>
              <div className="mt-2 h-1.5 rounded bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (sk.iterations / sk.iterationGoal) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
                <span>{sk.domain}</span>
                <span>added {timeAgo(sk.addedAt)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">
              No skills match these filters.
            </div>
          )}
        </div>
      </div>

      {selected && <SkillDrawer skill={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded border text-[11px] uppercase tracking-[0.12em] transition-colors ${
        active
          ? "bg-primary/15 border-primary/60 text-success"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function SkillDrawer({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative ml-auto h-full w-full md:max-w-lg overflow-y-auto border-l p-4 md:p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold">{skill.name}</h2>
            <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-[0.14em]">
              {skill.domain}
            </div>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded border text-[10px] uppercase tracking-[0.12em] ${TIER_COLOR[skill.tier]}`}
          >
            {skill.tier}
          </span>
        </div>

        <p className="text-sm text-foreground/90 mb-4">{skill.description}</p>

        <div className="grid grid-cols-3 gap-2 text-[11px] mb-4">
          <Stat label="Iterations" value={`${skill.iterations.toLocaleString()}/${skill.iterationGoal.toLocaleString()}`} />
          <Stat label="Pass rate (50)" value={`${Math.round(skill.passRateLast50 * 100)}%`} />
          <Stat label="Last run" value={timeAgo(skill.lastPracticedAt)} />
        </div>

        <Section title="Recent practice runs">
          <ul className="space-y-1 text-xs">
            {skill.recentRuns.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-border/40 pb-1">
                <span className="truncate">
                  <span className="mr-2">{r.passed ? "✅" : "❌"}</span>
                  {r.scenario}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {r.durationMs}ms · {timeAgo(r.at)}
                </span>
              </li>
            ))}
            {skill.recentRuns.length === 0 && (
              <li className="text-muted-foreground">No recent runs.</li>
            )}
          </ul>
        </Section>

        <Section title="Gap analysis (last learning session)">
          {skill.gapAnalysis.length ? (
            <ul className="list-disc pl-5 text-xs space-y-1">
              {skill.gapAnalysis.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No gaps recorded.</p>
          )}
        </Section>

        <Section title="Action items in progress">
          <ul className="space-y-1 text-xs">
            {skill.actionItems
              .filter((a) => a.status !== "done")
              .map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-[0.12em] ${
                      a.status === "in_progress"
                        ? "border-primary/60 text-success"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {a.status.replace("_", " ")}
                  </span>
                  <span>{a.text}</span>
                </li>
              ))}
            {skill.actionItems.filter((a) => a.status !== "done").length === 0 && (
              <li className="text-muted-foreground">None open.</li>
            )}
          </ul>
        </Section>

        <button
          onClick={onClose}
          className="mt-4 w-full px-3 py-2 rounded border text-xs uppercase tracking-[0.16em]"
          style={{ borderColor: "var(--border)" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}