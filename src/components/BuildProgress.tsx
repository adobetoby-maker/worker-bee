import { useEffect, useState } from "react";
import { subscribeAgentWS } from "@/lib/agent-ws";

interface BuildLogEntry {
  timestamp: number;
  message: string;
  type: "log" | "status" | "phase" | "commit" | "github";
}

interface Props {
  tabId: string;
  building: boolean;
}

export function BuildProgress({ tabId, building }: Props) {
  const [logs, setLogs] = useState<BuildLogEntry[]>([]);

  useEffect(() => {
    const append = (message: string, type: BuildLogEntry["type"]) => {
      if (!message) return;
      setLogs((prev) => [...prev, { timestamp: Date.now(), message, type }]);
    };
    return subscribeAgentWS(tabId, {
      onBuildLog: ({ message }) => append(message, "log"),
      onNarratorStatus: ({ line }) => append(line, "status"),
      onBuildPhase: ({ phase, message }) =>
        append(`${phase}${message ? `: ${message}` : ""}`, "phase"),
      onBuildCommitted: ({ commitHash }) =>
        append(`✅ Git commit: ${commitHash.slice(0, 8)}`, "commit"),
      onGithubPushed: ({ repoUrl }) => append(`📤 Pushed to ${repoUrl}`, "github"),
    });
  }, [tabId]);

  if (logs.length === 0) return null;

  const colorFor = (type: BuildLogEntry["type"]) => {
    switch (type) {
      case "commit":
        return {
          bg: "color-mix(in oklab, var(--primary) 12%, transparent)",
          fg: "var(--primary)",
        };
      case "github":
        return {
          bg: "color-mix(in oklab, var(--accent) 18%, transparent)",
          fg: "var(--accent-foreground)",
        };
      case "status":
        return { bg: "transparent", fg: "var(--muted-foreground)" };
      case "phase":
        return {
          bg: "color-mix(in oklab, var(--foreground) 6%, transparent)",
          fg: "var(--foreground)",
        };
      default:
        return { bg: "transparent", fg: "var(--foreground)" };
    }
  };

  return (
    <div
      className="mb-4"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "var(--muted-foreground)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            margin: 0,
          }}
        >
          Build Progress
        </h3>
        {building && (
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "var(--primary)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              Building…
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {logs.map((log, i) => {
          const c = colorFor(log.type);
          return (
            <div
              key={i}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                background: c.bg,
                color: c.fg,
                fontSize: log.type === "status" ? 10 : 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {log.message}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setLogs([])}
        className="mt-3"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "var(--muted-foreground)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        Clear logs
      </button>
    </div>
  );
}
