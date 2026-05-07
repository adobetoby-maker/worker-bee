import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getLearningSnapshot,
  type LearningSnapshot,
  type CompletedSession,
  type FluencySkill,
} from "@/lib/learning/learning.functions";

export const Route = createFileRoute("/learning")({
  head: () => ({
    meta: [
      { title: "Learning Sessions — Worker Bee" },
      {
        name: "description",
        content:
          "Live status of Worker Bee's learning sessions, today's completed sessions, and skill fluency progress.",
      },
      { property: "og:title", content: "Learning Sessions — Worker Bee" },
      {
        property: "og:description",
        content:
          "What the bee is learning right now, today's session log, and fluency progress per skill.",
      },
    ],
  }),
  loader: () => getLearningSnapshot(),
  component: LearningPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <h1 className="text-base font-semibold text-destructive">Learning data failed to load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          className="mt-4 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-surface-2/60"
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
    <div className="p-6">
      Not found.{" "}
      <Link to="/" className="underline text-primary">
        Home
      </Link>
    </div>
  ),
});

function LearningPage() {
  const initial = Route.useLoaderData() as LearningSnapshot;
  const [snap, setSnap] = useState<LearningSnapshot>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        setRefreshing(true);
        const next = await getLearningSnapshot();
        if (!stopped) setSnap(next);
      } catch {
        /* keep last snapshot */
      } finally {
        if (!stopped) setRefreshing(false);
      }
    };
    const id = window.setInterval(tick, 10_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Worker Bee
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-semibold">Learning Sessions</h1>
        </div>
        <div className="flex items-center gap-2">
          {snap.source === "demo" && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md border border-border">
              demo
            </span>
          )}
          <span
            className="text-xs"
            style={{ color: refreshing ? "var(--primary)" : "var(--muted-foreground)" }}
          >
            {refreshing ? "Refreshing…" : "10s poll"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6 pb-12">
        <LiveSection snap={snap} />
        <SessionsSection
          sessions={snap.sessions}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />
        <FluencySection fluency={snap.fluency} />
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-foreground mb-3">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-4 sm:p-5 rounded-lg border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

function LiveSection({ snap }: { snap: LearningSnapshot }) {
  const { live } = snap;
  return (
    <section>
      <SectionTitle>Live Status</SectionTitle>
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md border font-medium"
            style={{
              color: live.running ? "var(--success)" : "var(--muted-foreground)",
              borderColor: live.running
                ? "color-mix(in oklab, var(--success) 30%, transparent)"
                : "var(--border)",
              background: live.running
                ? "color-mix(in oklab, var(--success) 10%, transparent)"
                : "transparent",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: live.running ? "var(--success)" : "var(--muted-foreground)",
                animation: live.running ? "pulse-neon 1.4s ease-in-out infinite" : undefined,
              }}
            />
            {live.running ? "Session running" : "Idle"}
          </span>
          <StatInline label="Session" value={`${live.sessionNumber} of ${live.sessionsToday}`} />
          <StatInline label="Message" value={`${live.messageNumber} of ${live.totalMessages}`} />
        </div>

        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1.5">Current topic</div>
          <div className="text-sm font-medium">
            {live.currentTopic || <span className="text-muted-foreground font-normal">—</span>}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">Last 5 messages</div>
          {live.recentMessages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No live transcript yet.</div>
          ) : (
            <ul className="space-y-2">
              {live.recentMessages.map((m, i) => (
                <li
                  key={i}
                  className="text-sm leading-snug pl-3"
                  style={{
                    borderLeft: `2px solid ${m.role === "claude" ? "var(--primary)" : "var(--success)"}`,
                  }}
                >
                  <span
                    className="text-xs font-medium mr-2"
                    style={{ color: m.role === "claude" ? "var(--primary)" : "var(--success)" }}
                  >
                    {m.role === "claude" ? "Claude" : "Bee"}
                  </span>
                  <span className="text-foreground/90">{m.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </section>
  );
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value}</span>
    </div>
  );
}

function SessionsSection({
  sessions,
  expandedId,
  onToggle,
}: {
  sessions: CompletedSession[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <section>
      <SectionTitle>Today's Sessions ({sessions.length})</SectionTitle>
      {sessions.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No completed sessions yet today.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const open = expandedId === s.id;
            return (
              <div
                key={s.id}
                className="rounded-lg border overflow-hidden"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  onClick={() => onToggle(s.id)}
                  className="w-full text-left p-4 hover:bg-surface-2/40 transition"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">{s.topic}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTime(s.completedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <ScoreChip label="Gap" value={`${s.gapScore}%`} good={s.gapScore >= 70} />
                    <ScoreChip
                      label="Teach-back"
                      value={`${s.teachBackScore.toFixed(1)}/10`}
                      good={s.teachBackScore >= 7}
                    />
                    <span className="text-muted-foreground">
                      {open ? "▲ hide" : "▼ show"} transcript
                    </span>
                  </div>
                  <div className="mt-2 text-xs grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <span className="text-muted-foreground mr-2">Action:</span>
                      {s.actionItem || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-2">Reading:</span>
                      {s.reading || "—"}
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 pt-0" style={{ borderTop: "1px solid var(--border)" }}>
                    {s.transcript.length === 0 ? (
                      <p className="text-sm text-muted-foreground pt-3">No transcript stored.</p>
                    ) : (
                      <ul className="space-y-2 pt-3">
                        {s.transcript.map((m, i) => (
                          <li
                            key={i}
                            className="text-sm leading-snug pl-3"
                            style={{
                              borderLeft: `2px solid ${m.role === "claude" ? "var(--primary)" : "var(--success)"}`,
                            }}
                          >
                            <span
                              className="text-xs font-medium mr-2"
                              style={{
                                color: m.role === "claude" ? "var(--primary)" : "var(--success)",
                              }}
                            >
                              {m.role === "claude" ? "Claude" : "Bee"}
                            </span>
                            {m.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ScoreChip({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" style={{ color: good ? "var(--success)" : "var(--primary)" }}>
        {value}
      </span>
    </span>
  );
}

function FluencySection({ fluency }: { fluency: FluencySkill[] }) {
  return (
    <section className="pb-12">
      <SectionTitle>Fluency Progress</SectionTitle>
      {fluency.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            No skill practice files found in manifests/pipelines.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {fluency.map((f) => {
            const pct = Math.min(100, (f.iterations / f.goal) * 100);
            return (
              <div
                key={f.skill}
                className="p-4 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <span className="text-sm font-medium font-mono">{f.skill}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-medium" style={{ color: tierColor(f.tier) }}>
                      {f.tier}
                    </span>
                    <span
                      style={{ color: trendColor(f.failureRateTrend) }}
                      title={`Failure rate ${f.failureRatePct}%`}
                    >
                      {trendArrow(f.failureRateTrend)} {f.failureRatePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className="relative h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: tierColor(f.tier),
                      transition: "width 400ms ease",
                    }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground font-mono">
                  {f.iterations.toLocaleString()} / {f.goal.toLocaleString()} iterations
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function tierColor(tier: FluencySkill["tier"]) {
  switch (tier) {
    case "Fluent":
      return "var(--success)";
    case "Proficient":
      return "var(--primary)";
    case "Practicing":
      return "color-mix(in oklab, var(--primary) 70%, var(--muted-foreground))";
    default:
      return "var(--muted-foreground)";
  }
}

function trendColor(t: FluencySkill["failureRateTrend"]) {
  if (t === "improving") return "var(--success)";
  if (t === "declining") return "var(--destructive)";
  return "var(--muted-foreground)";
}

function trendArrow(t: FluencySkill["failureRateTrend"]) {
  if (t === "improving") return "▼";
  if (t === "declining") return "▲";
  return "■";
}

function formatTime(iso: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
  } catch {
    return iso;
  }
}
