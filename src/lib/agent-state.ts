export type LogLevel = "OK" | "ERR" | "ARROW";

export interface LogLine {
  ts: string;
  level: LogLevel;
  msg: string;
}

export const INITIAL_LOG: LogLine[] = [
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

export function nowTs(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
