type LogLevel = "OK" | "ERR" | "ARROW";

interface LogLine {
  ts: string;
  level: LogLevel;
  msg: string;
}

const LINES: LogLine[] = [
  { ts: "12:04:21", level: "OK", msg: "model loaded" },
  { ts: "12:04:22", level: "OK", msg: "context window 8192" },
  { ts: "12:04:23", level: "ARROW", msg: "tool:web_search" },
  { ts: "12:04:24", level: "ARROW", msg: "tool:fs_read /docs" },
  { ts: "12:04:25", level: "ERR", msg: "timeout 5000ms" },
  { ts: "12:04:26", level: "ARROW", msg: "retry attempt=1" },
  { ts: "12:04:27", level: "OK", msg: "stream open" },
  { ts: "12:04:28", level: "ARROW", msg: "tokens=128 t/s=42.1" },
  { ts: "12:04:29", level: "ARROW", msg: "tool:shell exec" },
  { ts: "12:04:30", level: "OK", msg: "exit 0" },
  { ts: "12:04:31", level: "ARROW", msg: "embed batch=16" },
  { ts: "12:04:32", level: "OK", msg: "cache hit ratio=0.74" },
  { ts: "12:04:33", level: "ERR", msg: "ratelimit::tool/web" },
  { ts: "12:04:34", level: "ARROW", msg: "fallback:cached" },
  { ts: "12:04:35", level: "OK", msg: "session persisted" },
];

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

export function AgentLog() {
  return (
    <div className="flex flex-col flex-1 min-h-0 border-t border-border">
      <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border bg-surface/40">
        // AGENT_LOG
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        {LINES.map((line, i) => {
          const tag = tagFor(line.level);
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
