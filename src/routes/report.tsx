import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getMorningReport,
  setPriority,
  decideApproval,
  type MorningReport,
  type PendingApproval,
} from "@/lib/report/report.functions";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Morning Report — Worker Bee" },
      {
        name: "description",
        content:
          "Overnight summary, site status, pending approvals, Jay's requests, today's learning schedule, and priority.",
      },
      { property: "og:title", content: "Morning Report — Worker Bee" },
      {
        property: "og:description",
        content: "Under-5-minute morning briefing for the bee.",
      },
    ],
  }),
  loader: () => getMorningReport(),
  component: ReportPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background text-foreground p-6 font-mono">
        <h1 className="text-lg uppercase tracking-[0.18em] text-destructive">
          Report failed to load
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

function ReportPage() {
  const initial = Route.useLoaderData() as MorningReport;

  return <ReportPageInner initial={initial} />;
}

function ClientTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(new Date(iso).toLocaleString());
  }, [iso]);
  return <span suppressHydrationWarning>{text || "—"}</span>;
}

function ReportPageInner({ initial }: { initial: MorningReport }) {
  const [report, setReport] = useState<MorningReport>(initial);
  const [priorityInput, setPriorityInput] = useState(initial.currentPriority);
  const [savingPriority, setSavingPriority] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, "approve" | "reject">>({});

  const savePriority = async () => {
    setSavingPriority(true);
    try {
      const res = await setPriority({ data: { priority: priorityInput } });
      setReport((r) => ({ ...r, currentPriority: res.priority }));
    } finally {
      setSavingPriority(false);
    }
  };

  const decide = async (a: PendingApproval, decision: "approve" | "reject") => {
    setDecisions((d) => ({ ...d, [a.id]: decision }));
    try {
      await decideApproval({ data: { id: a.id, decision } });
    } catch {
      setDecisions((d) => {
        const copy = { ...d };
        delete copy[a.id];
        return copy;
      });
    }
  };

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
          <h1 className="text-sm md:text-base uppercase tracking-[0.22em]">
            Morning Report
          </h1>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <ClientTime iso={report.generatedAt} /> · source: {report.source}
        </span>
      </header>

      <main className="px-4 md:px-6 py-4 md:py-6 max-w-[1100px] mx-auto pb-24 md:pb-6 space-y-5">
        <Section n={1} title="Overnight Summary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Sessions" value={report.overnight.sessionsCompleted} />
            <Stat label="Skills" value={report.overnight.skillsPracticed} />
            <Stat label="Iterations" value={report.overnight.iterationsLogged.toLocaleString()} />
            <Stat
              label="Failures"
              value={report.overnight.failures.length}
              tone={report.overnight.failures.length > 0 ? "warn" : "ok"}
            />
          </div>
          {report.overnight.failures.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {report.overnight.failures.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-destructive">⚠</span>
                  <span className="text-muted-foreground">{f.skill}:</span>
                  <span>{f.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section n={2} title="Site Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {report.sites.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 px-3 py-2 border"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: healthColor(s.health) }}
                  aria-label={s.health}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.note}</div>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                >
                  open →
                </a>
              </div>
            ))}
          </div>
        </Section>

        <Section n={3} title="Pending Approvals" count={report.approvals.length}>
          {report.approvals.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing waiting.</p>
          ) : (
            <ul className="space-y-2">
              {report.approvals.map((a) => {
                const decided = decisions[a.id];
                return (
                  <li
                    key={a.id}
                    className="px-3 py-2 border"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium">{a.skill}</div>
                        <div className="text-xs mt-0.5">{a.changed}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          why: {a.why}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {decided ? (
                          <span
                            className={`text-[10px] uppercase tracking-[0.16em] px-2 py-1 ${
                              decided === "approve" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {decided === "approve" ? "Approved" : "Rejected"}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => decide(a, "approve")}
                              className="text-[10px] uppercase tracking-[0.16em] px-2 py-1 border hover:bg-surface-2/40"
                              style={{ borderColor: "var(--success, #22c55e)", color: "var(--success, #22c55e)" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decide(a, "reject")}
                              className="text-[10px] uppercase tracking-[0.16em] px-2 py-1 border hover:bg-surface-2/40"
                              style={{ borderColor: "var(--destructive, #ef4444)", color: "var(--destructive, #ef4444)" }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {report.jayRequests.length > 0 && (
          <Section n={4} title="Jay's Requests" count={report.jayRequests.length}>
            <ul className="space-y-1.5">
              {report.jayRequests.map((j) => (
                <li
                  key={j.id}
                  className="flex items-start gap-3 px-3 py-2 border"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className={`text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 shrink-0 ${
                      j.status === "done"
                        ? "text-success"
                        : j.status === "blocked"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {j.status}
                  </span>
                  <span className="text-xs flex-1">{j.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section n={5} title="Today's Learning Schedule">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {report.schedule.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 border"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="tabular-nums text-xs text-success w-12">{s.time}</span>
                <span className="text-xs flex-1 truncate">{s.topic}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.domain}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section n={6} title="Priority for Today">
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={priorityInput}
              onChange={(e) => setPriorityInput(e.target.value)}
              placeholder="What do you want the bee working on today?"
              className="flex-1 px-3 py-2 text-sm bg-transparent border focus:outline-none focus:border-primary"
              style={{ borderColor: "var(--border)" }}
              maxLength={500}
            />
            <button
              onClick={savePriority}
              disabled={savingPriority || priorityInput === report.currentPriority}
              className="px-4 py-2 text-xs uppercase tracking-[0.18em] border hover:bg-surface-2/40 disabled:opacity-50"
              style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
            >
              {savingPriority ? "Saving…" : "Set Priority"}
            </button>
          </div>
          {report.currentPriority && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Current: <span className="text-foreground">{report.currentPriority}</span>
            </p>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({
  n,
  title,
  count,
  children,
}: {
  n: number;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="text-success mr-2">{String(n).padStart(2, "0")}</span>
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const color =
    tone === "warn" ? "var(--destructive, #ef4444)" : tone === "ok" ? "var(--success, #22c55e)" : "inherit";
  return (
    <div className="px-3 py-2 border" style={{ borderColor: "var(--border)" }}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function healthColor(h: "green" | "yellow" | "red"): string {
  if (h === "green") return "var(--success, #22c55e)";
  if (h === "yellow") return "#eab308";
  return "var(--destructive, #ef4444)";
}