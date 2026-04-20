import { useEffect, useRef, useState } from "react";
import { clearActivity, relativeTime, subscribeActivity, type ActivityEvent } from "@/lib/activity-feed";

const COLOR: Record<ActivityEvent["kind"], string> = {
  agent: "#ffaa00",
  tool: "#39ff14",
  connection: "#00bfff",
  vault: "#ffaa00",
  browser: "#39ff14",
};

export function ActivityFeed() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeActivity(setEvents), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // Re-render every 15s so "2m ago" stays fresh
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Hive Activity"
        className="text-base leading-none px-1.5 py-0.5 rounded hover:bg-surface-2/40 transition relative"
        style={{ filter: events.length ? "drop-shadow(0 0 4px #ffaa0099)" : undefined }}
      >
        📡
        {events.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 rounded-full"
            style={{ width: 6, height: 6, background: "#ffaa00" }}
          />
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-md border border-primary/40 bg-background shadow-[0_8px_30px_-8px_rgba(0,0,0,0.7)]"
          style={{ width: 320, animation: "var(--animate-slide-down)" }}
        >
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              📡 HIVE ACTIVITY
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {events.length}/50
            </span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="px-3 py-6 text-center font-mono text-[11px] text-muted-foreground">
                No activity yet — start chatting.
              </div>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className="px-3 py-1.5 border-b border-border/40 font-mono leading-snug"
                  style={{ fontSize: 12, color: COLOR[e.kind] }}
                >
                  <span>
                    {e.icon} {e.text}
                  </span>
                  <span className="text-muted-foreground ml-1.5" style={{ fontSize: 10 }}>
                    · {relativeTime(e.ts)}
                  </span>
                </div>
              ))
            )}
          </div>
          {events.length > 0 && (
            <div className="px-3 py-2 border-t border-border text-center">
              <button
                type="button"
                onClick={clearActivity}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors"
              >
                CLEAR FEED
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
