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
      <div className="min-h-screen bg-background text-foreground p-6 font-mono">
        <h1 className="text-lg uppercase tracking-[0.18em] text-destructive">
          Learning data failed to load
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

function LearningPage() {
  const initial = Route.useLoaderData() as LearningSnapshot;
  const [snap, setSnap] = useState<LearningSnapshot>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Poll every 10 seconds.
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
    <div
      className="min-h-screen text-foreground"
      style={{ background: "var(--background)" }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 backdrop-blur"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            ← Worker Bee
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-mono text-[13px] uppercase tracking-[0.22em]">
            <span style={{ color: "var(--primary)" }}>LEARNING</span>{" "}
            <span style={{ color: "var(--success)" }}>SESSIONS</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{ color: "var(--muted-foreground)" }}
            title={`Source: ${snap.source}`}
          >
            {snap.source === "demo" ? "DEMO DATA" : "LIVE"}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{
              color: refreshing ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            {refreshing ? "● refreshing" : "○ 10s poll"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-8">
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
  return (
    <h2
      className="font-mono text-[11px] uppercase tracking-[0.22em] mb-3"
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-4 sm:p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 4,
      }}
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
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1"
            style={{
              color: live.running ? "var(--success)" : "var(--muted-foreground)",
              border: `1px solid ${live.running ? "var(--success)" : "var(--border)"}`,
              background: live.running
                ? "color-mix(in oklab, var(--success) 10%, transparent)"
                : "transparent",
              borderRadius: 2,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: live.running ? "var(--success)" : "var(--muted-foreground)",
                animation: live.running ? "pulse-neon 1.4s ease-in-out infinite" : undefined,
              }}
            />
            {live.running ? "SESSION RUNNING" : "IDLE"}
          </span>
          <Stat
            label="Session"
            value={`${live.sessionNumber} of ${live.sessionsToday}`}
          />
          <Stat
            label="Message"
            value={`${live.messageNumber} of ${live.totalMessages}`}
          />
        </div>

        <div className="mb-4">
          <div
            className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Current Topic
          </div>
          <div className="text-sm">
            {live.currentTopic || (
              <span className="text-muted-foreground">— no topic —</span>
            )}
          </div>
        </div>

        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            Last 5 Messages
          </div>
          {live.recentMessages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No live transcript yet.</div>
          ) : (
            <ul className="space-y-2">
              {live.recentMessages.map((m, i) => (
                <li
                  key={i}
                  className="text-sm leading-snug pl-2"
                  style={{
                    borderLeft: `2px solid ${
                      m.role === "claude" ? "var(--primary)" : "var(--success)"
                    }`,
                  }}
                >
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.16em] mr-2"
                    style={{
                      color:
                        m.role === "claude" ? "var(--primary)" : "var(--success)",
                    }}
                  >
                    {m.role === "claude" ? "CLAUDE" : "BEE"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span
        className="font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      <span className="font-mono text-sm">{value}</span>
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
          <p className="text-sm text-muted-foreground">
            No completed sessions yet today.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const open = expandedId === s.id;
            return (
              <div
                key={s.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggle(s.id)}
                  className="w-full text-left p-4 hover:bg-surface-2/40 transition"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">{s.topic}</span>
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.16em]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {formatTime(s.completedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] font-mono">
                    <ScoreChip
                      label="GAP"
                      value={`${s.gapScore}%`}
                      good={s.gapScore >= 70}
                    />
                    <ScoreChip
                      label="TEACH-BACK"
                      value={`${s.teachBackScore.toFixed(1)}/10`}
                      good={s.teachBackScore >= 7}
                    />
                    <span className="text-muted-foreground">
                      ▸ {open ? "hide transcript" : "show transcript"}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.16em] mr-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        ACTION
                      </span>
                      {s.actionItem || "—"}
                    </div>
                    <div>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.16em] mr-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        READING
                      </span>
                      {s.reading || "—"}
                    </div>
                  </div>
                </button>
                {open && (
                  <div
                    className="px-4 pb-4 pt-0"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    {s.transcript.length === 0 ? (
                      <p className="text-sm text-muted-foreground pt-3">
                        No transcript stored.
                      </p>
                    ) : (
                      <ul className="space-y-2 pt-3">
                        {s.transcript.map((m, i) => (
                          <li
                            key={i}
                            className="text-sm leading-snug pl-2"
                            style={{
                              borderLeft: `2px solid ${
                                m.role === "claude"
                                  ? "var(--primary)"
                                  : "var(--success)"
                              }`,
                            }}
                          >
                            <span
                              className="font-mono text-[10px] uppercase tracking-[0.16em] mr-2"
                              style={{
                                color:
                                  m.role === "claude"
                                    ? "var(--primary)"
                                    : "var(--success)",
                              }}
                            >
                              {m.role === "claude" ? "CLAUDE" : "BEE"}
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

function ScoreChip({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <span
      style={{
        color: good ? "var(--success)" : "var(--primary)",
      }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.16em] mr-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      {value}
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
                className="p-4"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <span className="font-mono text-sm">{f.skill}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span
                      style={{
                        color: tierColor(f.tier),
                      }}
                      className="uppercase tracking-[0.16em]"
                    >
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
                  className="relative h-2 w-full overflow-hidden"
                  style={{
                    background: "var(--surface-2, color-mix(in oklab, var(--foreground) 8%, transparent))",
                    borderRadius: 2,
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${pct}%`,
                      background: tierColor(f.tier),
                      transition: "width 400ms ease",
                    }}
                  />
                </div>
                <div
                  className="mt-1 font-mono text-[10px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
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
      return "color-mix(in oklab, var(--primary) 60%, var(--muted-foreground))";
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
    // Use UTC to keep server- and client-rendered output identical (avoids
    // SSR hydration mismatch from per-locale formatting).
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
  } catch {
    return iso;
  }
}
