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
      <div className="min-h-screen bg-background text-foreground p-6">
        <h1 className="text-base font-semibold text-destructive">Report failed to load</h1>
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

function ClientTime({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(new Date(iso).toLocaleString());
  }, [iso]);
  return <span suppressHydrationWarning>{text || "—"}</span>;
}

function ReportPage() {
  const initial = Route.useLoaderData() as MorningReport;
  return <ReportPageInner initial={initial} />;
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
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-semibold">Morning Report</h1>
        </div>
        <span className="text-xs text-muted-foreground">
          <ClientTime iso={report.generatedAt} /> · {report.source}
        </span>
      </header>

      <main className="px-4 md:px-6 py-5 max-w-[1100px] mx-auto pb-24 md:pb-8 space-y-4">
        <Section title="Overnight Summary">
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
            <ul className="mt-3 space-y-1">
              {report.overnight.failures.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-destructive shrink-0">⚠</span>
                  <span className="text-muted-foreground">{f.skill}:</span>
                  <span>{f.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Site Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {report.sites.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md border"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: healthColor(s.health) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.note}</div>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  open →
                </a>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Pending Approvals" count={report.approvals.length}>
          {report.approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          ) : (
            <ul className="space-y-2">
              {report.approvals.map((a) => {
                const decided = decisions[a.id];
                return (
                  <li
                    key={a.id}
                    className="px-3 py-3 rounded-md border"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{a.skill}</div>
                        <div className="text-sm mt-0.5">{a.changed}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">why: {a.why}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {decided ? (
                          <span
                            className={`text-xs px-2 py-1 rounded-md font-medium ${
                              decided === "approve" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {decided === "approve" ? "Approved" : "Rejected"}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => decide(a, "approve")}
                              className="text-xs px-3 py-1.5 rounded-md border font-medium hover:opacity-80 transition"
                              style={{
                                borderColor: "var(--success)",
                                color: "var(--success)",
                                background: "color-mix(in oklab, var(--success) 8%, transparent)",
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decide(a, "reject")}
                              className="text-xs px-3 py-1.5 rounded-md border font-medium hover:opacity-80 transition"
                              style={{
                                borderColor: "var(--destructive)",
                                color: "var(--destructive)",
                                background:
                                  "color-mix(in oklab, var(--destructive) 8%, transparent)",
                              }}
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
          <Section title="Jay's Requests" count={report.jayRequests.length}>
            <ul className="space-y-1.5">
              {report.jayRequests.map((j) => (
                <li
                  key={j.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-md border"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md border shrink-0 font-medium ${
                      j.status === "done"
                        ? "text-success border-success/30 bg-success/8"
                        : j.status === "blocked"
                          ? "text-destructive border-destructive/30 bg-destructive/8"
                          : "text-muted-foreground border-border"
                    }`}
                  >
                    {j.status}
                  </span>
                  <span className="text-sm flex-1">{j.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Today's Learning Schedule">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {report.schedule.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md border"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="tabular-nums text-sm font-mono text-success w-12 shrink-0">
                  {s.time}
                </span>
                <span className="text-sm flex-1 truncate">{s.topic}</span>
                <span className="text-xs text-muted-foreground shrink-0">{s.domain}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Priority for Today">
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={priorityInput}
              onChange={(e) => setPriorityInput(e.target.value)}
              placeholder="What do you want the bee working on today?"
              className="flex-1 px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              style={{ borderColor: "var(--border)" }}
              maxLength={500}
            />
            <button
              onClick={savePriority}
              disabled={savingPriority || priorityInput === report.currentPriority}
              className="px-4 py-2 text-sm font-medium rounded-md border hover:opacity-80 disabled:opacity-40 transition"
              style={{
                borderColor: "var(--primary)",
                color: "var(--primary)",
                background: "color-mix(in oklab, var(--primary) 8%, transparent)",
              }}
            >
              {savingPriority ? "Saving…" : "Set Priority"}
            </button>
          </div>
          {report.currentPriority && (
            <p className="mt-2 text-xs text-muted-foreground">
              Current: <span className="text-foreground">{report.currentPriority}</span>
            </p>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border p-4 md:p-5"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {typeof count === "number" && (
          <span className="text-xs text-muted-foreground">{count}</span>
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
    tone === "warn" ? "var(--destructive)" : tone === "ok" ? "var(--success)" : "var(--foreground)";
  return (
    <div
      className="px-4 py-3 rounded-md border"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
    >
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function healthColor(h: "green" | "yellow" | "red"): string {
  if (h === "green") return "var(--success)";
  if (h === "yellow") return "#ca8a04";
  return "var(--destructive)";
}
