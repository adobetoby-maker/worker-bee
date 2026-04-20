interface Props {
  level: "warn" | "critical";
  count: number;
  onPrimary: () => void;
  onDismiss: () => void;
}

export function ConcurrencyBanner({ level, count, onPrimary, onDismiss }: Props) {
  const isCritical = level === "critical";
  const styles = isCritical
    ? {
        background: "#1a0000",
        border: "1px solid #ff3b3b40",
        color: "#ff3b3b",
      }
    : {
        background: "#1a1400",
        border: "1px solid #ffaa0040",
        color: "#ffaa00",
      };

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 font-mono text-[11px]"
      style={{
        ...styles,
        animation: "var(--animate-slide-down)",
      }}
      role="alert"
    >
      <div className="flex-1 leading-relaxed">
        {isCritical ? (
          <>
            <span className="font-bold">🔴 CRITICAL:</span> {count} concurrent agents detected.
            Most local machines (8–16 GB RAM) will swap to disk or crash. Strongly recommend
            stopping all but one agent.
          </>
        ) : (
          <>
            <span className="font-bold">⚠</span> {count} agents running concurrently — RAM
            pressure high on local machines. Consider pausing inactive agents.
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onPrimary}
        className="shrink-0 px-3 py-1 rounded font-mono text-[10px] uppercase tracking-[0.15em] border transition-colors"
        style={{
          borderColor: styles.color,
          color: styles.color,
          background: "transparent",
        }}
      >
        {isCritical ? "STOP ALL BUT THIS ONE" : "PAUSE OTHERS"}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 px-3 py-1 rounded font-mono text-[10px] uppercase tracking-[0.15em] opacity-70 hover:opacity-100"
        style={{ color: styles.color }}
      >
        {isCritical ? "I UNDERSTAND, CONTINUE" : "DISMISS"}
      </button>
    </div>
  );
}
