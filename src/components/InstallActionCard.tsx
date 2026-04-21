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
  const borderColor = isBlocked ? "#ff3b3b" : "#ffaa00";
  const titleColor = isBlocked ? "#ff8a8a" : "#ffaa00";
  const bg = isBlocked ? "#1a0000" : "#1a1400";

  return (
    <div
      className="mx-4 mb-2 rounded-md font-mono text-[12px]"
      style={{
        border: `1px solid ${borderColor}`,
        background: bg,
        color: "#e6e6e6",
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2 uppercase tracking-[0.18em] text-[11px]"
        style={{ color: titleColor, borderBottom: `1px solid ${borderColor}55` }}
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
          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#ffd97a" }}
        >
          {command}
        </div>

        {isBlocked && blockedReason && (
          <div style={{ color: "#ff8a8a" }}>{blockedReason}</div>
        )}

        {(state === "running" || state === "done") && (
          <pre
            ref={preRef}
            className="px-2 py-2 rounded overflow-y-auto"
            style={{
              background: "#080808",
              border: "1px solid #1a1a1a",
              color: "#ccc",
              maxHeight: 220,
              whiteSpace: "pre-wrap",
            }}
          >
            {output || (state === "running" ? "starting…" : "")}
            {state === "done" && (
              <span style={{ color: exitCode === 0 ? "#39ff14" : "#ff8a8a" }}>
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
              style={{ background: "#39ff14", color: "#001a00" }}
            >
              ✅ Approve & Install
            </button>
            <button
              type="button"
              onClick={onDeny}
              className="px-3 py-1 rounded border uppercase tracking-[0.18em] text-[11px]"
              style={{ borderColor: "#ff3b3b66", color: "#ff8a8a" }}
            >
              ❌ Deny
            </button>
          </div>
        )}
      </div>
    </div>
  );
}