export type LoginCardState = "running" | "success" | "failed";

interface Props {
  state: LoginCardState;
  url: string;
  logs: string[];
  attempts?: number;
  error?: string;
  onTryRepair?: () => void;
  onDismiss?: () => void;
}

function logColor(line: string): string {
  if (line.includes("✅")) return "var(--success)";
  if (line.includes("⚠") || line.includes("❌")) return "var(--destructive)";
  return "#2d5fa6";
}

export function LoginStatusCard({ state, url, logs, attempts, error, onTryRepair, onDismiss }: Props) {
  const isSuccess = state === "success";
  const isFailed = state === "failed";
  const borderColor = isSuccess ? "var(--success)" : isFailed ? "var(--destructive)" : "#2d5fa6";
  const bg = isSuccess
    ? "color-mix(in oklab, var(--success) 8%, var(--surface))"
    : isFailed
    ? "color-mix(in oklab, var(--destructive) 8%, var(--surface))"
    : "color-mix(in oklab, #2d5fa6 8%, var(--surface))";
  const titleColor = isSuccess ? "var(--success)" : isFailed ? "var(--destructive)" : "#2d5fa6";

  return (
    <div
      className="mx-4 my-2 rounded-md p-3"
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        fontFamily: "JetBrains Mono, monospace",
        animation: "var(--animate-slide-down)",
      }}
    >
      <div style={{ color: titleColor, fontSize: 12, letterSpacing: "0.18em", marginBottom: 8 }}>
        {isSuccess ? `✅ LOGGED IN — ${url}` : isFailed ? `❌ LOGIN FAILED${attempts ? ` after ${attempts} attempts` : ""}` : `🔐 LOGGING IN — ${url}`}
      </div>

      {logs.length > 0 && (
        <div
          className="rounded p-2 mb-2"
          style={{ background: "var(--background)", border: "1px solid var(--border)", maxHeight: 160, overflowY: "auto" }}
        >
          {logs.map((line, i) => (
            <div key={i} style={{ color: logColor(line), fontSize: 12, lineHeight: 1.5 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {isSuccess && (
        <div style={{ color: "var(--success)", fontSize: 11 }}>
          Session saved — future visits stay logged in
        </div>
      )}

      {isFailed && (
        <>
          {error && (
            <div style={{ color: "var(--destructive)", fontSize: 11, marginBottom: 8, whiteSpace: "pre-wrap" }}>
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            {onTryRepair && (
              <button
                type="button"
                onClick={onTryRepair}
                className="px-2 py-1 rounded"
                style={{ border: "1px solid var(--primary)", color: "var(--primary)", background: "var(--background)", fontSize: 11, letterSpacing: "0.15em" }}
              >
                🔧 TRY SELF-REPAIR
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-2 py-1 rounded"
                style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", background: "var(--background)", fontSize: 11, letterSpacing: "0.15em" }}
              >
                DISMISS
              </button>
            )}
          </div>
        </>
      )}

      {isSuccess && onDismiss && (
        <div className="text-right mt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="px-2 py-0.5"
            style={{ color: "var(--muted-foreground)", fontSize: 10, letterSpacing: "0.2em" }}
          >
            dismiss ✕
          </button>
        </div>
      )}
    </div>
  );
}