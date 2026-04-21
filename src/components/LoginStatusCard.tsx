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
  if (line.includes("✅")) return "#39ff14";
  if (line.includes("⚠") || line.includes("❌")) return "#ff8a8a";
  return "#7fc3ff";
}

export function LoginStatusCard({ state, url, logs, attempts, error, onTryRepair, onDismiss }: Props) {
  const isSuccess = state === "success";
  const isFailed = state === "failed";
  const borderColor = isSuccess ? "#39ff14" : isFailed ? "#ff3b3b" : "#00aaff";
  const bg = isSuccess ? "#001a06" : isFailed ? "#1a0000" : "#00091a";
  const titleColor = isSuccess ? "#39ff14" : isFailed ? "#ff8a8a" : "#00aaff";

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
          style={{ background: "#000", border: "1px solid #00224488", maxHeight: 160, overflowY: "auto" }}
        >
          {logs.map((line, i) => (
            <div key={i} style={{ color: logColor(line), fontSize: 12, lineHeight: 1.5 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {isSuccess && (
        <div style={{ color: "#9fe2a3", fontSize: 11 }}>
          Session saved — future visits stay logged in
        </div>
      )}

      {isFailed && (
        <>
          {error && (
            <div style={{ color: "#ffb3b3", fontSize: 11, marginBottom: 8, whiteSpace: "pre-wrap" }}>
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            {onTryRepair && (
              <button
                type="button"
                onClick={onTryRepair}
                className="px-2 py-1 rounded"
                style={{ border: "1px solid #ffaa0066", color: "#ffaa00", background: "#0a0a0a", fontSize: 11, letterSpacing: "0.15em" }}
              >
                🔧 TRY SELF-REPAIR
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-2 py-1 rounded"
                style={{ border: "1px solid #33333366", color: "#aaa", background: "#0a0a0a", fontSize: 11, letterSpacing: "0.15em" }}
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
            style={{ color: "#7fb5d6", fontSize: 10, letterSpacing: "0.2em" }}
          >
            dismiss ✕
          </button>
        </div>
      )}
    </div>
  );
}