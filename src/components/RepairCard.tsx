import { useEffect, useState } from "react";

export type RepairCardState = "started" | "complete" | "failed";

interface Props {
  state: RepairCardState;
  error: string;
  logs: string[];
  onCopyLog?: () => void;
  onOpenConfig?: () => void;
  onDismiss?: () => void;
}

const PHASES = [
  "Reading agent files",
  "Analyzing error logs",
  "Writing fix",
];

function logColor(line: string): string {
  if (line.includes("✅")) return "var(--success)";
  if (line.includes("⚠")) return "var(--destructive)";
  return "var(--primary)";
}

export function RepairCard({ state, error, logs, onCopyLog, onOpenConfig, onDismiss }: Props) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (state !== "started") return;
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < PHASES.length; i++) {
      timers.push(setTimeout(() => setRevealed((n) => Math.max(n, i + 1)), 800 * (i + 1)));
    }
    return () => { timers.forEach(clearTimeout); };
  }, [state]);

  const isComplete = state === "complete";
  const isFailed = state === "failed";
  const borderColor = isComplete ? "var(--success)" : "var(--destructive)";
  const titleColor = "var(--primary)";

  return (
    <div className="flex items-start gap-3 justify-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-base">
        🔧
      </div>
      <div
        className="max-w-[75%]"
        style={{
          background: "color-mix(in oklab, var(--destructive) 8%, var(--surface))",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          padding: 12,
          fontFamily: "JetBrains Mono, monospace",
          width: "100%",
        }}
      >
        <div style={{ color: titleColor, fontSize: 12, marginBottom: 8, letterSpacing: "0.1em" }}>
          🔧 SELF-REPAIR INITIATED
        </div>
        <div style={{ color: "var(--destructive)", fontSize: 11, marginBottom: 10 }}>
          Error: {error}
        </div>
        {state === "started" && (
          <>
            <div style={{ color: "var(--foreground)", fontSize: 11, marginBottom: 6 }}>
              qwen is diagnosing the problem...
            </div>
            <div className="space-y-1">
              {PHASES.map((p, i) => (
                <div
                  key={p}
                  style={{
                    color: i < revealed ? "var(--primary)" : "var(--muted-foreground)",
                    fontSize: 11,
                    transition: "color 200ms ease",
                  }}
                >
                  ⏳ {p}
                </div>
              ))}
            </div>
          </>
        )}
        {logs.length > 0 && (
          <div
            className="mt-3 space-y-0.5"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: 8,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {logs.map((line, i) => (
              <div key={i} style={{ color: logColor(line), fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {line}
              </div>
            ))}
          </div>
        )}
        {isComplete && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid var(--border)` }}>
            <div style={{ color: "var(--success)", fontSize: 12, marginBottom: 4 }}>
              ✅ SELF-REPAIR COMPLETE
            </div>
            <div style={{ color: "var(--success)", fontSize: 11 }}>Agent is restarting...</div>
            <div style={{ color: "var(--success)", fontSize: 11 }}>Reconnecting in 3 seconds</div>
          </div>
        )}
        {isFailed && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid var(--border)` }}>
            <div style={{ color: "var(--destructive)", fontSize: 12, marginBottom: 4 }}>
              ❌ REPAIR FAILED
            </div>
            <div style={{ color: "var(--destructive)", fontSize: 11, marginBottom: 8 }}>
              Could not auto-fix the issue.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCopyLog}
                className="px-2 py-1 rounded border text-[10px] uppercase tracking-[0.15em]"
                style={{ borderColor: "var(--destructive)", color: "var(--destructive)", background: "var(--surface)" }}
              >
                📋 COPY ERROR LOG
              </button>
              <button
                type="button"
                onClick={onOpenConfig}
                className="px-2 py-1 rounded border text-[10px] uppercase tracking-[0.15em]"
                style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface)" }}
              >
                ⚙ OPEN CONFIG
              </button>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="ml-auto px-2 py-1 text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  dismiss ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}