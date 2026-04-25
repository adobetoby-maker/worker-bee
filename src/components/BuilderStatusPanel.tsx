import { useEffect, useRef, useState } from "react";
import { BeeLogo } from "@/components/BeeLogo";

export type BuilderStageId =
  | "received"
  | "dreaming"
  | "planning"
  | "building"
  | "applying"
  | "critiquing"
  | "fixing"
  | "done"
  | "spec"
  | "review"
  | "error";

export interface BuilderStage {
  id: BuilderStageId;
  label: string;
  subtext?: string;
  color: string;
  files?: string[];
  errorMessage?: string;
  ts: number;
  /** SPEC stage: 3-bullet summary of what Worker Bee understood */
  specBullets?: string[];
  /** REVIEW stage: numbered list of files to be created */
  plannedFiles?: string[];
}

interface Props {
  active: boolean;
  current: BuilderStage | null;
  history: BuilderStage[];
  onTryAgain?: () => void;
  /** SPEC stage handlers */
  onSpecConfirm?: () => void;
  onSpecRefine?: (feedback: string) => void;
  /** REVIEW stage handlers */
  onReviewApprove?: () => void;
  onReviewEdit?: () => void;
}

const STAGE_DOTS: Array<{ id: BuilderStageId; short: string }> = [
  { id: "spec", short: "spec" },
  { id: "received", short: "got" },
  { id: "dreaming", short: "drm" },
  { id: "planning", short: "pln" },
  { id: "review", short: "rev" },
  { id: "building", short: "BLD" },
  { id: "applying", short: "apl" },
  { id: "critiquing", short: "crt" },
  { id: "fixing", short: "fix" },
  { id: "done", short: "done" },
];

const MONO = "'JetBrains Mono', monospace";

export function BuilderStatusPanel({
  active,
  current,
  history,
  onTryAgain,
  onSpecConfirm,
  onSpecRefine,
  onReviewApprove,
  onReviewEdit,
}: Props) {
  const [worried, setWorried] = useState(false);
  const lastTickRef = useRef<number>(Date.now());
  const [specInput, setSpecInput] = useState("");

  // Reset SPEC input whenever a new spec stage arrives
  useEffect(() => {
    if (current?.id === "spec") setSpecInput("");
  }, [current?.id, current?.ts]);

  // Reset worried timer whenever the current stage changes
  useEffect(() => {
    setWorried(false);
    lastTickRef.current = Date.now();
    if (!current || current.id === "done" || current.id === "error") return;
    const t = window.setInterval(() => {
      if (Date.now() - lastTickRef.current >= 20000) setWorried(true);
    }, 1000);
    return () => window.clearInterval(t);
  }, [current?.id, current?.ts]);

  if (!active && !current) return null;

  const isError = current?.id === "error";
  const isDone = current?.id === "done";
  const streaming = !!current && !isDone && !isError;

  // Determine current dot index
  const currentIdx = current
    ? STAGE_DOTS.findIndex((d) => d.id === current.id)
    : -1;
  // Completed = anything that has appeared in history before current
  const completedIds = new Set(history.map((h) => h.id));

  const recentHistory = history.slice(-5);

  return (
    <div
      style={{
        margin: "0 12px 10px 12px",
        padding: 12,
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        animation: "slide-down 240ms ease-out",
        overflow: "hidden",
      }}
      aria-live="polite"
    >
      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          marginBottom: 10,
          fontFamily: MONO,
          fontSize: 8,
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {STAGE_DOTS.map((d, i) => {
          const isCurrent = i === currentIdx;
          const isCompleted = !isCurrent && (completedIds.has(d.id) || (currentIdx > -1 && i < currentIdx));
          const dotColor = isError && isCurrent
            ? "#ff3b3b"
            : isCurrent
              ? "var(--primary)"
              : isCompleted
                ? "#34d399"
                : "var(--border)";
          return (
            <div
              key={d.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                flex: 1,
                opacity: isCurrent ? 1 : isCompleted ? 0.85 : 0.4,
              }}
            >
              <div
                style={{
                  width: isCurrent ? 10 : 8,
                  height: isCurrent ? 10 : 8,
                  borderRadius: "50%",
                  background: dotColor,
                  animation: isCurrent && !isError
                    ? "pulse-dot 1.4s ease-in-out infinite"
                    : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 7,
                  color: "#001",
                  fontWeight: 700,
                }}
              >
                {isCompleted ? "✓" : ""}
              </div>
              <div style={{ fontSize: 8 }}>{d.short}</div>
            </div>
          );
        })}
      </div>

      {/* Current stage */}
      {current && (
        <div
          key={`${current.id}-${current.ts}`}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            animation: "fade-in 280ms ease-out",
          }}
        >
          <div
            style={{
              position: "relative",
              flexShrink: 0,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BeeLogo size={24} streaming={streaming} error={isError} />
            {worried && !isError && !isDone && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: "1.5px solid var(--primary)",
                  animation: "pulse-dot 1.6s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 700,
                color: current.color,
              }}
            >
              {current.label}
            </div>
            {current.subtext && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {current.subtext}
              </div>
            )}
            {current.id === "planning" && current.subtext && (
              <div
                style={{
                  marginTop: 6,
                  padding: "6px 8px",
                  background: "var(--surface-2, var(--surface))",
                  border: "1px dashed var(--border)",
                  borderRadius: 4,
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                  opacity: 0.85,
                }}
              >
                {current.subtext}
              </div>
            )}
            {current.id === "spec" && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                {current.specBullets && current.specBullets.length > 0 && (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontFamily: MONO,
                      fontSize: 11,
                      color: "var(--foreground)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {current.specBullets.slice(0, 3).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                    fontStyle: "italic",
                  }}
                >
                  Is this right? (yes / change it)
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = specInput.trim();
                    if (!v) return;
                    if (v.toLowerCase() === "yes") {
                      onSpecConfirm?.();
                    } else {
                      onSpecRefine?.(v);
                    }
                    setSpecInput("");
                  }}
                  className="flex gap-1.5 flex-col sm:flex-row"
                >
                  <input
                    type="text"
                    value={specInput}
                    onChange={(e) => setSpecInput(e.target.value)}
                    placeholder='type "yes" or describe a change…'
                    autoFocus
                    className="min-h-[44px] sm:min-h-0 text-base sm:text-[11px]"
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      background: "var(--surface, transparent)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontFamily: MONO,
                    }}
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] sm:min-h-0 text-base sm:text-[11px]"
                    style={{
                      padding: "6px 10px",
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                      border: "none",
                      borderRadius: 6,
                      fontFamily: MONO,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
            {current.id === "review" && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                  }}
                >
                  Files to be created:
                </div>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: 22,
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--foreground)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {(current.plannedFiles ?? []).map((f, i) => (
                    <li key={f + i}>{f}</li>
                  ))}
                </ol>
                <div className="flex gap-2 mt-1 flex-col sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onReviewApprove?.()}
                    className="min-h-[48px] sm:min-h-0 text-base sm:text-[11px]"
                    style={{
                      padding: "6px 12px",
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontFamily: MONO,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✓ Looks good — Build it
                  </button>
                  <button
                    type="button"
                    onClick={() => onReviewEdit?.()}
                    className="min-h-[48px] sm:min-h-0 text-base sm:text-[11px]"
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontFamily: MONO,
                      cursor: "pointer",
                    }}
                  >
                    ✎ Edit Plan
                  </button>
                </div>
              </div>
            )}
            {current.id === "building" && (
              <div
                style={{
                  marginTop: 8,
                  width: "100%",
                  height: 4,
                  background: "var(--surface)",
                  borderRadius: 2,
                  overflow: "hidden",
                  position: "relative",
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "40%",
                    background:
                      "linear-gradient(90deg, transparent, var(--primary), transparent)",
                    animation: "build-progress 1.4s linear infinite",
                  }}
                />
              </div>
            )}
            {current.id === "applying" && current.files && current.files.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                {current.files.map((f, idx) => (
                  <div
                    key={f + idx}
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      color: "var(--foreground)",
                      animation: `fade-in 320ms ease-out ${idx * 80}ms backwards`,
                    }}
                  >
                    📄 {f}
                  </div>
                ))}
              </div>
            )}
            {worried && !isError && !isDone && (
              <div
                style={{
                  marginTop: 6,
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                  fontStyle: "italic",
                }}
              >
                Still working… (deepseek thinks deeply)
              </div>
            )}
            {isError && (
              <button
                type="button"
                onClick={onTryAgain}
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  background: "transparent",
                  color: "#ff3b3b",
                  border: "1px solid #ff3b3b",
                  borderRadius: 6,
                  fontFamily: MONO,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                🔄 Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* History trail */}
      {recentHistory.length > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: "1px dashed var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            opacity: 0.4,
          }}
        >
          {recentHistory.map((h, i) => (
            <div
              key={`${h.id}-${h.ts}-${i}`}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: h.color,
              }}
            >
              {h.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
