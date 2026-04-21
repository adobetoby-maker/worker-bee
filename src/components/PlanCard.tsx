// Worker Bee — Task Planner card.
// Driven by plan_* WebSocket events from the agent.
// Styling uses CSS variables only.

import { useEffect, useRef } from "react";
import type { PlanStep, PlanStepStatus, PlanLogLevel } from "@/lib/agent-ws";

export type PlanCardState = "generating" | "ready" | "running" | "complete" | "error";

export interface PlanLogLine {
  message: string;
  level: PlanLogLevel;
}

export interface PlanStepRuntime {
  status: PlanStepStatus | "pending";
  result?: Record<string, unknown> | null;
}

interface Props {
  goal: string;
  state: PlanCardState;
  steps: PlanStep[];
  runtime: Record<number, PlanStepRuntime>;
  current: number;
  total: number;
  logs: PlanLogLine[];
  completed?: number;
  failed?: number;
  errorMsg?: string;
  showResults?: boolean;
  onExecute?: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onToggleResults?: () => void;
  onDismiss?: () => void;
}

function statusIcon(s: PlanStepRuntime["status"]): { icon: string; color: string; pulse?: boolean } {
  switch (s) {
    case "done":    return { icon: "✅", color: "var(--success)" };
    case "failed":  return { icon: "❌", color: "var(--destructive)" };
    case "running": return { icon: "⏳", color: "var(--primary)", pulse: true };
    default:        return { icon: "○",  color: "var(--muted-foreground)" };
  }
}

function logColor(level: PlanLogLevel): string {
  switch (level) {
    case "ok":    return "var(--success)";
    case "error": return "var(--destructive)";
    case "warn":  return "var(--primary)";
    default:      return "var(--muted-foreground)";
  }
}

function logPrefix(level: PlanLogLevel): string {
  switch (level) {
    case "ok":    return "[OK] ";
    case "error": return "[ERR] ";
    case "warn":  return "[!] ";
    default:      return "[→] ";
  }
}

export function PlanCard({
  goal,
  state,
  steps,
  runtime,
  current,
  total,
  logs,
  completed = 0,
  failed = 0,
  errorMsg,
  showResults = false,
  onExecute,
  onCancel,
  onPause,
  onResume,
  onStop,
  onToggleResults,
  onDismiss,
}: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  const isError = state === "error";
  const borderColor = isError ? "var(--destructive)" : "var(--primary)";
  const titleColor = isError ? "var(--destructive)" : "var(--primary)";
  const totalSteps = total || steps.length;
  const pct = totalSteps > 0 ? Math.round((current / totalSteps) * 100) : 0;

  return (
    <div
      className="mx-4 mb-2 rounded-md"
      style={{
        border: `1px solid ${borderColor}`,
        background: "var(--surface)",
        color: "var(--foreground)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between gap-2 uppercase tracking-[0.18em]"
        style={{ color: titleColor, borderBottom: `1px solid var(--border)`, fontSize: 11 }}
      >
        <span>
          🗺 Task Plan
          {state === "ready" && totalSteps > 0 && ` — ${totalSteps} steps`}
          {state === "running" && ` — running`}
          {state === "complete" && ` — done`}
          {state === "generating" && ` — generating…`}
          {state === "error" && ` — error`}
        </span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              fontSize: 11,
            }}
            title="Dismiss"
          >
            ✕
          </button>
        )}
      </div>

      <div className="px-3 py-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <span style={{ color: "var(--muted-foreground)" }}>Goal: </span>
          <span style={{ color: "var(--foreground)" }}>{goal || "—"}</span>
        </div>

        {state === "generating" && (
          <div style={{ color: "var(--primary)" }}>
            ⏳ Generating steps with deepseek…
          </div>
        )}

        {isError && errorMsg && (
          <div
            style={{
              background: "color-mix(in oklab, var(--destructive) 10%, var(--background))",
              border: "1px solid var(--destructive)",
              color: "var(--destructive)",
              padding: "6px 8px",
              borderRadius: 4,
            }}
          >
            ❌ {errorMsg}
          </div>
        )}

        {steps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {steps.map((step, idx) => {
              const rt = runtime[step.id] ?? { status: "pending" as const };
              const { icon, color, pulse } = statusIcon(rt.status);
              return (
                <div
                  key={step.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "4px 6px",
                    borderRadius: 4,
                    background: rt.status === "running"
                      ? "color-mix(in oklab, var(--primary) 8%, transparent)"
                      : "transparent",
                  }}
                >
                  <span
                    style={{
                      color,
                      width: 16,
                      flexShrink: 0,
                      animation: pulse ? "pulse 1.2s ease-in-out infinite" : undefined,
                    }}
                  >
                    {icon}
                  </span>
                  <span style={{ color: "var(--muted-foreground)", width: 24, flexShrink: 0 }}>
                    {idx + 1}.
                  </span>
                  <span style={{ flex: 1, color: "var(--foreground)" }}>
                    {step.description}
                  </span>
                  {step.action && (
                    <span
                      style={{
                        flexShrink: 0,
                        padding: "1px 6px",
                        borderRadius: 999,
                        fontSize: 10,
                        background: "color-mix(in oklab, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                        border: "1px solid color-mix(in oklab, var(--primary) 35%, transparent)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {step.action}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(state === "running" || state === "complete") && totalSteps > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--background)",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--primary), var(--primary-glow, var(--primary)))",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
              {current} / {totalSteps} steps
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div
            ref={logRef}
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "6px 8px",
              maxHeight: 160,
              overflowY: "auto",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {logs.map((l, i) => (
              <div key={i} style={{ color: logColor(l.level), whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {logPrefix(l.level)}{l.message}
              </div>
            ))}
          </div>
        )}

        {state === "complete" && (
          <div
            style={{
              color: failed === 0 ? "var(--success)" : "var(--destructive)",
              fontSize: 11,
            }}
          >
            {failed === 0
              ? `✅ Plan complete — ${completed}/${totalSteps} succeeded`
              : `⚠ ${failed} step${failed === 1 ? "" : "s"} failed (${completed}/${totalSteps} succeeded)`}
          </div>
        )}

        {state === "complete" && showResults && (
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "6px 8px",
              fontSize: 11,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {steps.map((step, idx) => {
              const rt = runtime[step.id];
              return (
                <div key={step.id} style={{ borderTop: idx === 0 ? "none" : "1px dashed var(--border)", paddingTop: idx === 0 ? 0 : 6, marginTop: idx === 0 ? 0 : 6 }}>
                  <div style={{ color: "var(--muted-foreground)" }}>
                    {idx + 1}. {step.description}
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      color: "var(--foreground)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: 10,
                    }}
                  >
                    {rt?.result ? JSON.stringify(rt.result, null, 2) : "(no result)"}
                  </pre>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 flex-wrap pt-1">
          {state === "ready" && (
            <>
              <button
                type="button"
                onClick={onExecute}
                className="px-3 py-1 rounded uppercase tracking-[0.18em]"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 11 }}
              >
                ▶ Execute Plan
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 rounded border uppercase tracking-[0.18em]"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", background: "transparent", fontSize: 11 }}
              >
                ✕ Cancel
              </button>
            </>
          )}
          {state === "running" && (
            <>
              {onPause && (
                <button
                  type="button"
                  onClick={onPause}
                  className="px-3 py-1 rounded border uppercase tracking-[0.18em]"
                  style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "transparent", fontSize: 11 }}
                >
                  ⏸ Pause
                </button>
              )}
              {onResume && (
                <button
                  type="button"
                  onClick={onResume}
                  className="px-3 py-1 rounded border uppercase tracking-[0.18em]"
                  style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "transparent", fontSize: 11 }}
                >
                  ▶ Resume
                </button>
              )}
              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="px-3 py-1 rounded border uppercase tracking-[0.18em]"
                  style={{ borderColor: "var(--destructive)", color: "var(--destructive)", background: "transparent", fontSize: 11 }}
                >
                  ◼ Stop
                </button>
              )}
            </>
          )}
          {state === "complete" && onToggleResults && (
            <button
              type="button"
              onClick={onToggleResults}
              className="px-3 py-1 rounded border uppercase tracking-[0.18em]"
              style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "transparent", fontSize: 11 }}
            >
              📋 {showResults ? "Hide" : "View"} Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}