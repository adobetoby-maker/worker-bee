import { useEffect, useRef, useState } from "react";
import {
  tokenStreamSubscribe,
  tokenStreamGet,
  tokenStreamClear,
} from "@/lib/token-stream";

interface TokenStreamPanelProps {
  onClose?: () => void;
}

export function TokenStreamPanel({ onClose }: TokenStreamPanelProps = {}) {
  const [, force] = useState(0);
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    return tokenStreamSubscribe(() => force((n) => n + 1));
  }, []);

  // Auto-scroll to bottom on new tokens.
  useEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const { buffer, active } = tokenStreamGet();

  if (!open) return null;

  const charCount = buffer.length;

  return (
    <div
      className="fixed z-40 font-mono text-[11px]"
      style={{
        right: 16,
        bottom: 16,
        width: minimized ? 220 : 380,
        maxWidth: "calc(100vw - 32px)",
        background: "color-mix(in oklab, var(--surface) 92%, transparent)",
        border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
        borderRadius: 10,
        boxShadow: "0 10px 30px -10px color-mix(in oklab, var(--primary) 25%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-b cursor-pointer select-none"
        style={{ borderColor: "color-mix(in oklab, var(--border) 60%, transparent)" }}
        onClick={() => setMinimized((m) => !m)}
      >
        <div className="flex items-center gap-1.5 uppercase tracking-[0.18em] text-[9px] text-muted-foreground">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: active ? "var(--primary)" : "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
              animation: active ? "var(--animate-blink)" : undefined,
            }}
          />
          <span>token stream</span>
          {active && <span className="text-primary normal-case tracking-normal">live</span>}
          <span className="text-muted-foreground/60 normal-case tracking-normal">
            · {charCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); tokenStreamClear(); }}
            className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
            title="Clear"
          >
            clear
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1 leading-none"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? "▢" : "—"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onClose?.(); }}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1 leading-none"
            title="Hide"
          >
            ✕
          </button>
        </div>
      </div>
      {!minimized && (
        <pre
          ref={preRef}
          className="m-0 px-2.5 py-2 overflow-auto whitespace-pre-wrap break-words text-foreground/85"
          style={{ height: 220, lineHeight: 1.45 }}
        >
          {buffer}
          {active && (
            <span
              className="inline-block w-1.5 h-3 align-text-bottom ml-0.5"
              style={{
                background: "var(--primary)",
                animation: "var(--animate-blink)",
              }}
            />
          )}
          {!buffer && !active && (
            <span className="text-muted-foreground/60">Waiting for next response…</span>
          )}
        </pre>
      )}
    </div>
  );
}
