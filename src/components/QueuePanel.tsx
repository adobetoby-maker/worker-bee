import { useEffect, useRef, useState } from "react";
import {
  subscribeQueue,
  setParallelMode,
  cancelQueued,
  moveUp,
  type QueueState,
} from "@/lib/agent-queue";

interface Props {
  open: boolean;
  onClose: () => void;
  onStopActive: (tabId: string) => void;
}

function relSec(ts: number): string {
  return `${Math.max(0, Math.floor((Date.now() - ts) / 1000))}s`;
}

export function QueuePanel({ open, onClose, onStopActive }: Props) {
  const [snap, setSnap] = useState<QueueState | null>(null);
  const [, setTick] = useState(0);
  const [confirmParallel, setConfirmParallel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeQueue(setSnap), []);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  if (!open || !snap) return null;
  const empty = !snap.activeTabId && snap.queue.length === 0;

  return (
    <>
      <div
        ref={ref}
        className="absolute z-50"
        style={{
          top: 72,
          right: 12,
          width: 380,
          maxHeight: "70vh",
          background: "#0a0a0a",
          border: "1px solid #ffaa0040",
          borderRadius: 10,
          boxShadow: "0 12px 40px -12px #000",
          animation: "slide-down 180ms ease-out",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="px-3 py-2 font-mono text-[11px] tracking-[0.18em]"
          style={{ color: "#ffaa00", borderBottom: "1px solid #1a1a1a" }}
        >
          📋 AGENT QUEUE
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {empty && (
            <div
              className="text-center font-mono text-[12px] py-8"
              style={{ color: "#444" }}
            >
              🟢 All clear — no agents waiting
            </div>
          )}

          {snap.activeTabId && (
            <div
              className="rounded p-2.5"
              style={{
                background: "#0c1a0c",
                borderLeft: "3px solid #39ff14",
                border: "1px solid #39ff1430",
              }}
            >
              <div className="font-mono text-[11px]" style={{ color: "#39ff14" }}>
                🟢 RUNNING — {truncate(snap.activePreview || "(no preview)", 56)}
              </div>
              <div
                className="font-mono text-[10px] mt-1"
                style={{ color: "#777" }}
              >
                Model: {snap.activeModel ?? "—"} · Started:{" "}
                {snap.activeStartedAt ? relSec(snap.activeStartedAt) : "0s"} ago
              </div>
              <button
                type="button"
                onClick={() => onStopActive(snap.activeTabId!)}
                className="mt-2 font-mono text-[10px] px-2 py-1 rounded border"
                style={{
                  borderColor: "#ff3b3b66",
                  color: "#ff8a8a",
                  background: "#1a0606",
                }}
              >
                ⏹ STOP
              </button>
            </div>
          )}

          {snap.queue.map((q, i) => (
            <div
              key={q.tabId}
              className="rounded p-2.5"
              style={{
                background: "#1a1400",
                borderLeft: "3px solid #ffaa00",
                border: "1px solid #ffaa0030",
              }}
            >
              <div className="font-mono text-[11px]" style={{ color: "#ffaa00" }}>
                ⏳ #{i + 1} — {q.tabName} — {truncate(q.text, 48)}
              </div>
              <div
                className="font-mono text-[10px] mt-1"
                style={{ color: "#777" }}
              >
                Waiting {relSec(q.addedAt)}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => moveUp(q.tabId)}
                  disabled={i === 0}
                  className="font-mono text-[10px] px-2 py-1 rounded border"
                  style={{
                    borderColor: "#ffaa0055",
                    color: i === 0 ? "#555" : "#ffaa00",
                    opacity: i === 0 ? 0.4 : 1,
                  }}
                >
                  ↑ MOVE UP
                </button>
                <button
                  type="button"
                  onClick={() => cancelQueued(q.tabId)}
                  className="font-mono text-[10px] px-2 py-1 rounded border"
                  style={{ borderColor: "#ff3b3b55", color: "#ff8a8a" }}
                >
                  ✕ REMOVE
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          className="px-3 py-3 space-y-2"
          style={{ borderTop: "1px solid #1a1a1a", background: "#080808" }}
        >
          <div
            className="font-mono text-[10px] leading-relaxed"
            style={{ color: "#888" }}
          >
            🐝 Sequential mode protects your machine.
            <br />
            Running one agent at a time prevents RAM exhaustion.
          </div>
          <button
            type="button"
            onClick={() => {
              if (snap.parallelMode) setParallelMode(false);
              else setConfirmParallel(true);
            }}
            className="w-full font-mono text-[10px] px-2 py-1.5 rounded border tracking-[0.1em]"
            style={
              snap.parallelMode
                ? {
                    borderColor: "#ff3b3b66",
                    color: "#ff8a8a",
                    background: "#1a0606",
                  }
                : {
                    borderColor: "#ffaa0055",
                    color: "#ffaa00",
                    background: "transparent",
                  }
            }
          >
            {snap.parallelMode
              ? "⚡ DISABLE PARALLEL MODE (RETURN TO SAFE)"
              : "⚡ ENABLE PARALLEL MODE (DANGEROUS)"}
          </button>
        </div>
      </div>

      {confirmParallel && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "#000000cc", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-lg p-5 max-w-md"
            style={{
              background: "#0a0a0a",
              border: "1px solid #ff3b3b66",
              boxShadow: "0 0 40px -10px #ff3b3b55",
            }}
          >
            <div
              className="font-mono text-[13px] tracking-[0.15em] mb-3"
              style={{ color: "#ff8a8a" }}
            >
              ⚠ PARALLEL MODE WARNING
            </div>
            <div
              className="font-mono text-[11px] leading-relaxed mb-4"
              style={{ color: "#ccc" }}
            >
              Running multiple agents simultaneously will:
              <ul className="mt-2 ml-3 space-y-1">
                <li>• Multiply RAM/VRAM usage by agent count</li>
                <li>• Likely cause Ollama to crash on &lt; 32 GB machines</li>
                <li>• May corrupt in-progress responses</li>
              </ul>
              <div className="mt-3">
                Only enable if you have 32 GB+ RAM and know what you are doing.
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmParallel(false)}
                className="font-mono text-[11px] px-3 py-1.5 rounded border"
                style={{ borderColor: "#39ff1455", color: "#39ff14" }}
              >
                KEEP SAFE MODE
              </button>
              <button
                type="button"
                onClick={() => {
                  setParallelMode(true);
                  setConfirmParallel(false);
                }}
                className="font-mono text-[11px] px-3 py-1.5 rounded border"
                style={{
                  borderColor: "#ff3b3b66",
                  color: "#ff8a8a",
                  background: "#1a0606",
                }}
              >
                ENABLE ANYWAY
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
