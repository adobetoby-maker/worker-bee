// Worker Bee — install action card.
// Shown when the agent's response contains an install instruction.
// Two states: "prompt" (approve/deny) and "running" (streaming shell output).

import { useEffect, useRef } from "react";

export type InstallCardState = "prompt" | "running" | "done" | "blocked";

interface Props {
  command: string;
  state: InstallCardState;
  output?: string;
  exitCode?: number;
  blockedReason?: string;
  onApprove?: () => void;
  onDeny?: () => void;
}

export function InstallActionCard({
  command,
  state,
  output = "",
  exitCode,
  blockedReason,
  onApprove,
  onDeny,
}: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [output]);

  const isBlocked = state === "blocked";
  const borderColor = isBlocked ? "var(--destructive)" : "var(--primary)";
  const titleColor = isBlocked ? "var(--destructive)" : "var(--primary)";
  const bg = isBlocked
    ? "color-mix(in oklab, var(--destructive) 8%, var(--surface))"
    : "color-mix(in oklab, var(--primary) 8%, var(--surface))";

  return (
    <div
      className="mx-4 mb-2 rounded-md font-mono text-[12px]"
      style={{
        border: `1px solid ${borderColor}`,
        background: bg,
        color: "var(--foreground)",
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2 uppercase tracking-[0.18em] text-[11px]"
        style={{ color: titleColor, borderBottom: `1px solid var(--border)` }}
      >
        {isBlocked ? "🚨 Blocked — Unsafe Command" : state === "running"
          ? "🐚 Installing…"
          : state === "done"
          ? exitCode === 0 ? "✅ Install Complete" : "⚠ Install Failed"
          : "🔧 Agent Wants to Install"}
      </div>

      <div className="px-3 py-3 space-y-2">
        <div
          className="px-2 py-1 rounded"
          style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--primary)" }}
        >
          {command}
        </div>

        {isBlocked && blockedReason && (
          <div style={{ color: "var(--destructive)" }}>{blockedReason}</div>
        )}

        {(state === "running" || state === "done") && (
          <pre
            ref={preRef}
            className="px-2 py-2 rounded overflow-y-auto"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              maxHeight: 220,
              whiteSpace: "pre-wrap",
            }}
          >
            {output || (state === "running" ? "starting…" : "")}
            {state === "done" && (
              <span style={{ color: exitCode === 0 ? "var(--success)" : "var(--destructive)" }}>
                {"\n"}
                {exitCode === 0 ? "✅ Done" : `⚠ exit ${exitCode}`}
              </span>
            )}
          </pre>
        )}

        {state === "prompt" && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onApprove}
              className="px-3 py-1 rounded uppercase tracking-[0.18em] text-[11px]"
              style={{ background: "var(--success)", color: "var(--success-foreground)" }}
            >
              ✅ Approve & Install
            </button>
            <button
              type="button"
              onClick={onDeny}
              className="px-3 py-1 rounded border uppercase tracking-[0.18em] text-[11px]"
              style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
            >
              ❌ Deny
            </button>
          </div>
        )}
      </div>
    </div>
  );
}