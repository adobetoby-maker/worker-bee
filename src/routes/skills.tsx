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
      <div className="p-6 text-sm text-foreground">
        <p className="mb-3 text-destructive font-medium">Failed to load skills: {error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-surface-2/60"
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6 text-sm text-foreground">Skills not found.</div>,
});

const TIER_COLOR: Record<FluencyTier, { text: string; bg: string; border: string }> = {
  Beginner: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
  },
  Practicing: {
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
  },
  Proficient: {
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  Fluent: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
  },
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
      if (q && !`${sk.name} ${sk.description} ${sk.domain}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [snap.skills, query, tier, domain, recentOnly]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        <header className="mb-5">
          <h1 className="text-xl font-semibold">🧠 Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {snap.skills.length} skills tracked · updated {timeAgo(snap.generatedAt)}
          </p>
        </header>

        <div
          className="rounded-lg border p-4 mb-5 space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            style={{ borderColor: "var(--border)" }}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Tier:</span>
            <FilterChip active={tier === "all"} onClick={() => setTier("all")}>
              All
            </FilterChip>
            {ALL_TIERS.map((t) => (
              <FilterChip key={t} active={tier === t} onClick={() => setTier(t)}>
                {t}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Domain:</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((sk) => {
            const tc = TIER_COLOR[sk.tier];
            return (
              <button
                key={sk.id}
                onClick={() => setSelected(sk)}
                className="text-left rounded-lg border p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{sk.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {sk.description}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-medium ${tc.text} ${tc.bg} ${tc.border}`}
                  >
                    {sk.tier}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <Stat
                    label="Iterations"
                    value={`${sk.iterations.toLocaleString()}/${sk.iterationGoal.toLocaleString()}`}
                  />
                  <Stat label="Pass rate" value={`${Math.round(sk.passRateLast50 * 100)}%`} />
                  <Stat label="Last run" value={timeAgo(sk.lastPracticedAt)} />
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (sk.iterations / sk.iterationGoal) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{sk.domain}</span>
                  <span>added {timeAgo(sk.addedAt)}</span>
                </div>
              </button>
            );
          })}
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
      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
        active
          ? "border-primary/50 bg-primary/8 text-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-foreground font-medium">{value}</div>
    </div>
  );
}

function SkillDrawer({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const tc = TIER_COLOR[skill.tier];
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative ml-auto h-full w-full md:max-w-lg overflow-y-auto border-l p-5 md:p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">{skill.name}</h2>
            <div className="text-xs text-muted-foreground mt-0.5">{skill.domain}</div>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-medium ${tc.text} ${tc.bg} ${tc.border}`}
          >
            {skill.tier}
          </span>
        </div>

        <p className="text-sm text-foreground/90 mb-4 leading-relaxed">{skill.description}</p>

        <div className="grid grid-cols-3 gap-3 text-xs mb-5">
          <Stat
            label="Iterations"
            value={`${skill.iterations.toLocaleString()}/${skill.iterationGoal.toLocaleString()}`}
          />
          <Stat label="Pass rate (50)" value={`${Math.round(skill.passRateLast50 * 100)}%`} />
          <Stat label="Last run" value={timeAgo(skill.lastPracticedAt)} />
        </div>

        <DrawerSection title="Recent practice runs">
          <ul className="space-y-1">
            {skill.recentRuns.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-1 border-b border-border/40 text-sm"
              >
                <span className="truncate">
                  <span className="mr-2">{r.passed ? "✅" : "❌"}</span>
                  {r.scenario}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums ml-3 shrink-0">
                  {r.durationMs}ms · {timeAgo(r.at)}
                </span>
              </li>
            ))}
            {skill.recentRuns.length === 0 && (
              <li className="text-sm text-muted-foreground py-1">No recent runs.</li>
            )}
          </ul>
        </DrawerSection>

        <DrawerSection title="Gap analysis (last learning session)">
          {skill.gapAnalysis.length ? (
            <ul className="list-disc pl-5 text-sm space-y-1">
              {skill.gapAnalysis.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No gaps recorded.</p>
          )}
        </DrawerSection>

        <DrawerSection title="Action items in progress">
          <ul className="space-y-1.5">
            {skill.actionItems
              .filter((a) => a.status !== "done")
              .map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-medium shrink-0 ${
                      a.status === "in_progress"
                        ? "border-primary/40 text-primary bg-primary/8"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {a.status.replace("_", " ")}
                  </span>
                  <span>{a.text}</span>
                </li>
              ))}
            {skill.actionItems.filter((a) => a.status !== "done").length === 0 && (
              <li className="text-sm text-muted-foreground">None open.</li>
            )}
          </ul>
        </DrawerSection>

        <button
          onClick={onClose}
          className="mt-4 w-full px-3 py-2.5 rounded-md border text-sm font-medium hover:bg-surface-2/60 transition"
          style={{ borderColor: "var(--border)" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
