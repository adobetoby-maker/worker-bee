export type LogLevel = "OK" | "ERR" | "ARROW";

export interface LogLine {
  ts: string;
  level: LogLevel;
  msg: string;
}

export const INITIAL_LOG: LogLine[] = [
  { ts: "00:00:00", level: "OK", msg: "OpenClaw agent runtime v0.1.0 started" },
  { ts: "00:00:00", level: "OK", msg: "Shell tool loaded (built-in)" },
  { ts: "00:00:01", level: "ARROW", msg: "Connect to Ollama to continue..." },
];

export function nowTs(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
