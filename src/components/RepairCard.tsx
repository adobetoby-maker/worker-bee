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
  if (line.includes("✅")) return "#39ff14";
  if (line.includes("⚠")) return "#ff3b3b";
  return "#ffaa00";
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
  const borderColor = isComplete ? "#39ff14" : "#ff3b3b";
  const titleColor = "#ffaa00";

  return (
    <div className="flex items-start gap-3 justify-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-base">
        🔧
      </div>
      <div
        className="max-w-[75%]"
        style={{
          background: "#1a0000",
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
        <div style={{ color: "#ff8a8a", fontSize: 11, marginBottom: 10 }}>
          Error: {error}
        </div>
        {state === "started" && (
          <>
            <div style={{ color: "#ccc", fontSize: 11, marginBottom: 6 }}>
              qwen is diagnosing the problem...
            </div>
            <div className="space-y-1">
              {PHASES.map((p, i) => (
                <div
                  key={p}
                  style={{
                    color: i < revealed ? "#ffaa00" : "#444",
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
              background: "#0a0000",
              border: "1px solid #330000",
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
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${borderColor}55` }}>
            <div style={{ color: "#39ff14", fontSize: 12, marginBottom: 4 }}>
              ✅ SELF-REPAIR COMPLETE
            </div>
            <div style={{ color: "#9fffa0", fontSize: 11 }}>Agent is restarting...</div>
            <div style={{ color: "#9fffa0", fontSize: 11 }}>Reconnecting in 3 seconds</div>
          </div>
        )}
        {isFailed && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${borderColor}55` }}>
            <div style={{ color: "#ff3b3b", fontSize: 12, marginBottom: 4 }}>
              ❌ REPAIR FAILED
            </div>
            <div style={{ color: "#ff8a8a", fontSize: 11, marginBottom: 8 }}>
              Could not auto-fix the issue.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCopyLog}
                className="px-2 py-1 rounded border text-[10px] uppercase tracking-[0.15em]"
                style={{ borderColor: "#ff3b3b66", color: "#ff8a8a", background: "#330000" }}
              >
                📋 COPY ERROR LOG
              </button>
              <button
                type="button"
                onClick={onOpenConfig}
                className="px-2 py-1 rounded border text-[10px] uppercase tracking-[0.15em]"
                style={{ borderColor: "#ffaa0066", color: "#ffaa00", background: "#1a1400" }}
              >
                ⚙ OPEN CONFIG
              </button>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="ml-auto px-2 py-1 text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: "#666" }}
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