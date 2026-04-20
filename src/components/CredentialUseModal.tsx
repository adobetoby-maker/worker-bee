interface Props {
  open: boolean;
  agentName: string;
  injectedPots: string[];
  onClose: () => void;
  onAllow: (potName: string, scope: "once" | "session") => void;
  onDeny: () => void;
  selected: string | null;
  onSelect: (name: string) => void;
}

export function CredentialUseModal({
  open,
  agentName,
  injectedPots,
  onClose,
  onAllow,
  onDeny,
  selected,
  onSelect,
}: Props) {
  if (!open) return null;
  const pick = selected ?? injectedPots[0] ?? "";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{ background: "#000000cc", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-5 w-[440px] max-w-[92vw]"
        style={{ background: "#0a0a0a", border: "1px solid #ffaa00" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="font-mono text-[13px] tracking-[0.15em] mb-3"
          style={{ color: "#ffaa00" }}
        >
          🔐 CREDENTIAL USE DETECTED
        </div>
        <p className="font-sans text-[12px] mb-4" style={{ color: "#ccc" }}>
          {agentName} appears to need credentials for this task.
        </p>

        <div className="mb-3">
          <div
            className="font-mono text-[10px] tracking-[0.15em] mb-1"
            style={{ color: "#777" }}
          >
            WHICH HONEY POT SHOULD IT USE?
          </div>
          {injectedPots.length === 0 ? (
            <div
              className="font-mono text-[11px] py-2 px-2 rounded"
              style={{ background: "#1a0000", color: "#ff8a8a", border: "1px solid #5a0000" }}
            >
              No honey pots are injected into this agent. Inject one from the vault first.
            </div>
          ) : (
            <select
              value={pick}
              onChange={(e) => onSelect(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono"
            >
              {injectedPots.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        <p
          className="font-sans text-[11px] leading-relaxed mb-4"
          style={{ color: "#888" }}
        >
          The credential will be accessed by the app on the agent's behalf.
          The raw value will <span style={{ color: "#39ff14" }}>NOT</span> be sent to Ollama.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDeny}
            className="px-3 py-1.5 rounded border font-mono text-[11px] tracking-[0.15em]"
            style={{ borderColor: "#5a0000", color: "#ff8a8a" }}
          >
            DENY
          </button>
          <button
            type="button"
            disabled={!pick}
            onClick={() => pick && onAllow(pick, "session")}
            className="px-3 py-1.5 rounded border font-mono text-[11px] tracking-[0.15em]"
            style={{
              borderColor: pick ? "#ffaa00" : "#333",
              color: pick ? "#ffaa00" : "#555",
              cursor: pick ? "pointer" : "not-allowed",
            }}
          >
            ALLOW FOR SESSION
          </button>
          <button
            type="button"
            disabled={!pick}
            onClick={() => pick && onAllow(pick, "once")}
            className="px-3 py-1.5 rounded font-mono text-[11px] tracking-[0.15em]"
            style={{
              background: pick ? "#39ff14" : "#222",
              color: pick ? "#001a00" : "#555",
              cursor: pick ? "pointer" : "not-allowed",
            }}
          >
            ALLOW THIS ONCE
          </button>
        </div>
      </div>
    </div>
  );
}
