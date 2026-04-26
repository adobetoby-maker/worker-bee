import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getPracticeSnapshot,
  type PracticeSnapshot,
  type PracticeRun,
  type SkillHealth,
} from "@/lib/practice/practice.functions";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice Loop — Worker Bee" },
      {
        name: "description",
        content:
          "Live status of Worker Bee's autonomous practice loop, recent runs, and per-skill health.",
      },
      { property: "og:title", content: "Practice Loop — Worker Bee" },
      {
        property: "og:description",
        content:
          "Autonomous practice runs, pass rates, and circuit-breaker status per skill.",
      },
    ],
  }),
  loader: () => getPracticeSnapshot(),
  component: PracticePage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background text-foreground p-6 font-mono">
        <h1 className="text-lg uppercase tracking-[0.18em] text-destructive">
          Practice data failed to load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          className="mt-4 px-3 py-1.5 border border-border text-xs uppercase tracking-[0.16em] hover:bg-surface-2/40"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-6 font-mono">
      Not found.{" "}
      <Link to="/" className="underline">
        Home
      </Link>
    </div>
  ),
});

// Stable color per skill (hashed to a hue)
function skillColor(skill: string): string {
  let h = 0;
  for (let i = 0; i < skill.length; i++) h = (h * 31 + skill.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `oklch(0.72 0.15 ${hue})`;
}

function PracticePage() {
  const initial = Route.useLoaderData() as PracticeSnapshot;
  const [snap, setSnap] = useState<PracticeSnapshot>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await getPracticeSnapshot();
        if (!cancelled) setSnap(next);
      } catch {
        // keep last good snapshot
      }
    };
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const maxRuns = useMemo(
    () => Math.max(1, ...snap.runsPerSkill.map((r) => r.runs)),
    [snap.runsPerSkill],
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <h1 className="text-sm md:text-base uppercase tracking-[0.22em] text-foreground">
            Practice Loop
          </h1>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          source: {snap.source} · refresh 5s
        </span>
      </header>

      <main className="px-4 md:px-6 py-4 md:py-6 space-y-6 max-w-[1400px] mx-auto pb-24 md:pb-6">
        <LoopStatus snap={snap} maxRuns={maxRuns} />
        <LiveFeed feed={snap.feed} />
        <SkillGrid skills={snap.skills} />
      </main>
    </div>
  );
}

function LoopStatus({ snap, maxRuns }: { snap: PracticeSnapshot; maxRuns: number }) {
  return (
    <section
      className="border p-4 md:p-5"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            {snap.running && (
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "var(--success, #22c55e)" }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{
                background: snap.running ? "var(--success, #22c55e)" : "var(--destructive, #ef4444)",
              }}
            />
          </span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Loop Status
            </div>
            <div className="text-base">
              {snap.running ? "Running" : "Idle"}
              {snap.currentSkill && (
                <>
                  {" · "}
                  <span style={{ color: skillColor(snap.currentSkill) }}>
                    {snap.currentSkill}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Runs Today
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {snap.totalRunsToday.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Runs per skill
        </div>
        <div className="space-y-1.5">
          {snap.runsPerSkill.map((r) => (
            <div key={r.skill} className="flex items-center gap-3">
              <div className="w-44 truncate text-xs text-muted-foreground">{r.skill}</div>
              <div
                className="flex-1 h-2 rounded-sm overflow-hidden"
                style={{ background: "var(--surface-2, #1e293b)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(r.runs / maxRuns) * 100}%`,
                    background: skillColor(r.skill),
                  }}
                />
              </div>
              <div className="w-12 text-right text-xs tabular-nums">{r.runs}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveFeed({ feed }: { feed: PracticeRun[] }) {
  return (
    <section
      className="border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="px-4 py-2 border-b text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <span>Live Practice Feed</span>
        <span>last {feed.length}</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
        {feed.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[14px_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-xs hover:bg-surface-2/40"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: skillColor(r.skill) }}
              aria-hidden
            />
            <span className="truncate" style={{ color: skillColor(r.skill) }}>
              {r.skill}
            </span>
            <span className="text-muted-foreground">{r.scenario}</span>
            <span className={r.pass ? "text-success" : "text-destructive"}>
              {r.pass ? "✅" : "❌"}
            </span>
            <span className="tabular-nums text-muted-foreground w-16 text-right">
              {r.durationMs}ms
            </span>
          </div>
        ))}
        {feed.length === 0 && (
          <div className="px-4 py-6 text-xs text-muted-foreground">No runs yet.</div>
        )}
      </div>
    </section>
  );
}

function SkillGrid({ skills }: { skills: SkillHealth[] }) {
  return (
    <section>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        Skill Health
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {skills.map((s) => {
          const healthy = s.passRatePct > 95;
          const broken = s.circuitBreakerActive;
          const borderColor = broken
            ? "var(--destructive, #ef4444)"
            : healthy
              ? "var(--success, #22c55e)"
              : "var(--border)";
          return (
            <div
              key={s.skill}
              className="p-3 border-2 transition-colors"
              style={{
                borderColor,
                background: "var(--surface)",
              }}
            >
              <div
                className="text-xs truncate font-medium"
                style={{ color: skillColor(s.skill) }}
                title={s.skill}
              >
                {s.skill}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  runs
                </span>
                <span className="text-base tabular-nums">{s.runsToday}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  pass
                </span>
                <span
                  className={`text-base tabular-nums ${healthy ? "text-success" : broken ? "text-destructive" : ""}`}
                >
                  {s.passRatePct}%
                </span>
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.16em]">
                Breaker:{" "}
                <span className={broken ? "text-destructive" : "text-success"}>
                  {broken ? "ACTIVE" : "CLEAR"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}