import { useEffect, useRef } from "react";
import type { LogLine, LogLevel } from "@/lib/agent-state";

const tagFor = (level: LogLevel) => {
  switch (level) {
    case "OK":
      return { label: "[OK] ", className: "text-success" };
    case "ERR":
      return { label: "[ERR]", className: "text-destructive" };
    case "ARROW":
      return { label: "[→]  ", className: "text-primary" };
  }
};

interface Props {
  lines: LogLine[];
}

export function AgentLog({ lines }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="flex flex-col flex-1 min-h-0 border-t border-border">
      <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border bg-surface/40">
        // AGENT_LOG
      </div>
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed"
      >
        {lines.map((line, i) => {
          const tag = tagFor(line.level);
          if (line.smoke) {
            return (
              <div key={i} className="whitespace-pre" style={{ color: "#39ff14" }}>
                <span style={{ color: "#39ff1499" }}>[{line.ts}]</span>{" "}
                <span>{tag.label}</span>{" "}
                <span>{line.msg}</span>
              </div>
            );
          }
          return (
            <div key={i} className="whitespace-pre text-muted-foreground">
              <span className="text-muted-foreground/60">[{line.ts}]</span>{" "}
              <span className={tag.className}>{tag.label}</span>{" "}
              <span className="text-foreground/80">{line.msg}</span>
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-1 text-primary">
          <span>$</span>
          <span
            className="inline-block w-2 h-3 bg-primary"
            style={{ animation: "var(--animate-blink)" }}
          />
        </div>
      </div>
    </div>
  );
}
