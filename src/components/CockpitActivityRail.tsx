import { useEffect, useRef, useState } from "react";
import {
  tokenStreamSubscribe,
  tokenStreamGet,
  tokenStreamClear,
} from "@/lib/token-stream";
import type { LogLine, LogLevel } from "@/lib/agent-state";

interface Props {
  log: LogLine[];
}

const tagFor = (level: LogLevel) => {
  switch (level) {
    case "OK":
      return { label: "[OK]", color: "var(--success, #39ff14)" };
    case "ERR":
      return { label: "[ERR]", color: "var(--destructive, #ff3b3b)" };
    case "ARROW":
      return { label: "[→]", color: "var(--primary)" };
  }
};

export function CockpitActivityRail({ log }: Props) {
  const [, force] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLPreElement>(null);

  useEffect(() => tokenStreamSubscribe(() => force((n) => n + 1)), []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const { buffer, active } = tokenStreamGet();

  return (
    <div className="flex flex-col h-full font-mono text-[11px] min-h-0">
      {/* Token stream — top half */}
      <div className="flex flex-col min-h-0 flex-1 border-b" style={{ borderColor: "color-mix(in oklab, var(--border) 60%, transparent)" }}>
        <div
          className="px-3 py-2 uppercase tracking-[0.2em] text-[9px] text-muted-foreground border-b flex items-center justify-between"
          style={{ borderColor: "color-mix(in oklab, var(--border) 50%, transparent)" }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: active ? "var(--primary)" : "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
                animation: active ? "var(--animate-blink)" : undefined,
              }}
            />
            // STREAM {active && <span className="text-primary normal-case tracking-normal ml-1">live</span>}
          </span>
          <button
            onClick={() => tokenStreamClear()}
            className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            title="Clear"
          >
            clear
          </button>
        </div>
        <pre
          ref={streamRef}
          className="m-0 px-3 py-2 overflow-auto whitespace-pre-wrap break-words text-foreground/85 flex-1 min-h-0"
          style={{ lineHeight: 1.45 }}
        >
          {buffer}
          {active && (
            <span
              className="inline-block w-1.5 h-3 align-text-bottom ml-0.5"
              style={{ background: "var(--primary)", animation: "var(--animate-blink)" }}
            />
          )}
          {!buffer && !active && (
            <span className="text-muted-foreground/60">Waiting for next response…</span>
          )}
        </pre>
      </div>

      {/* Agent log — bottom half */}
      <div className="flex flex-col min-h-0" style={{ flex: "1 1 50%" }}>
        <div
          className="px-3 py-2 uppercase tracking-[0.2em] text-[9px] text-muted-foreground border-b"
          style={{ borderColor: "color-mix(in oklab, var(--border) 50%, transparent)" }}
        >
          // AGENT_LOG · {log.length}
        </div>
        <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          {log.length === 0 && (
            <div className="text-muted-foreground/70">No activity yet.</div>
          )}
          {log.map((line, i) => {
            const t = tagFor(line.level);
            return (
              <div key={i} className="whitespace-pre-wrap break-words mb-0.5">
                <span className="text-muted-foreground/50">[{line.ts}]</span>{" "}
                <span style={{ color: t.color }}>{t.label}</span>{" "}
                <span className="text-foreground/80">{line.msg}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
