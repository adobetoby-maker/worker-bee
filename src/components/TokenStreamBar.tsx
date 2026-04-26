import { useEffect, useRef, useState } from "react";
import {
  tokenStreamSubscribe,
  tokenStreamGet,
  tokenStreamClear,
} from "@/lib/token-stream";

interface Props {
  onExpand?: () => void;
  expanded?: boolean;
}

/**
 * Slim inline token-stream strip rendered just above the chat composer.
 * Shows the live tail of the current response. A small button lets the
 * user opt into the floating popout panel — otherwise no popout shows.
 */
export function TokenStreamBar({ onExpand, expanded }: Props) {
  const [, force] = useState(0);
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => tokenStreamSubscribe(() => force((n) => n + 1)), []);

  // Auto-scroll horizontal tail to the right as new tokens arrive.
  useEffect(() => {
    const el = tailRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  });

  const { buffer, active } = tokenStreamGet();

  // Show last ~240 chars on a single line.
  const tail = buffer.length > 240 ? buffer.slice(buffer.length - 240) : buffer;

  if (!active && !buffer) return null;

  return (
    <div
      className="flex items-center gap-2 font-mono"
      style={{
        fontSize: 11,
        padding: "4px 10px",
        marginBottom: 6,
        borderRadius: 10,
        background: "color-mix(in oklab, var(--surface-2, var(--surface)) 70%, transparent)",
        border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
        color: "color-mix(in oklab, var(--foreground) 80%, transparent)",
        minHeight: 26,
      }}
    >
      <span
        className="inline-block flex-shrink-0"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: active
            ? "var(--primary)"
            : "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
          animation: active ? "var(--animate-blink)" : undefined,
        }}
      />
      <span
        className="uppercase tracking-[0.18em] flex-shrink-0 text-muted-foreground"
        style={{ fontSize: 9 }}
      >
        stream
      </span>
      <div
        ref={tailRef}
        className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap"
        style={{ scrollbarWidth: "none" }}
      >
        {tail || (
          <span className="text-muted-foreground/60">Waiting for next response…</span>
        )}
        {active && (
          <span
            className="inline-block align-text-bottom ml-0.5"
            style={{
              width: 5,
              height: 10,
              background: "var(--primary)",
              animation: "var(--animate-blink)",
            }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => tokenStreamClear()}
        className="text-muted-foreground hover:text-foreground uppercase tracking-[0.18em] flex-shrink-0"
        style={{ fontSize: 9 }}
        title="Clear"
      >
        clear
      </button>
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
          style={{ fontSize: 11, lineHeight: 1 }}
          title={expanded ? "Hide popout" : "Open popout"}
        >
          {expanded ? "▾" : "▴"}
        </button>
      )}
    </div>
  );
}
