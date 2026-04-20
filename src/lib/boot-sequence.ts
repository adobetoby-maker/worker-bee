import { nowTs, type LogLine } from "./agent-state";

const BOOT_LINES: Array<Pick<LogLine, "level" | "msg">> = [
  { level: "ARROW", msg: "Initializing Worker Bee agent runtime..." },
  { level: "OK", msg: "Core agent process started" },
  { level: "ARROW", msg: "Checking Playwright installation..." },
  { level: "OK", msg: "Playwright 1.44.0 detected" },
  { level: "ARROW", msg: "Launching Chromium browser instance..." },
  { level: "OK", msg: "Chromium 124 headless ready (port 9222)" },
  { level: "ARROW", msg: "Loading website builder tools..." },
  { level: "OK", msg: "DOM inspector ready" },
  { level: "OK", msg: "Screenshot engine ready" },
  { level: "OK", msg: "Form filler ready" },
  { level: "OK", msg: "CSS injector ready" },
  { level: "ARROW", msg: "Agent fully initialized — ready to build 🐝" },
];

/**
 * Streams the boot sequence into the provided log appender, one line every 150ms.
 * Returns a cancel function.
 */
export function runBootSequence(
  agentLabel: string,
  appendLog: (line: LogLine) => void,
): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  BOOT_LINES.forEach((line, i) => {
    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        appendLog({
          ts: nowTs(),
          level: line.level,
          msg: `[${agentLabel}] ${line.msg}`,
        });
      }, i * 150),
    );
  });
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}
