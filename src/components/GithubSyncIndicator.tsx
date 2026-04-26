import { useEffect, useState } from "react";
import { getGithubSyncStatus, type GithubSyncStatus } from "@/lib/github-sync.functions";

function relTime(iso: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function GithubSyncIndicator() {
  const [status, setStatus] = useState<GithubSyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const next = await getGithubSyncStatus();
      setStatus(next);
    } catch (err) {
      setStatus({
        connected: false,
        owner: null,
        repo: null,
        branch: null,
        lastCommit: null,
        lastPush: null,
        fetchedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Failed to fetch",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const dotColor = !status
    ? "#666"
    : status.connected
      ? "#39ff14"
      : status.error
        ? "#ff3b3b"
        : "#ffaa00";

  const stateLabel = !status
    ? "CHECKING…"
    : status.connected
      ? "CONNECTED"
      : status.error
        ? "ERROR"
        : "OFFLINE";

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderLeft: `3px solid ${dotColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}`,
            }}
          />
          <span
            className="font-mono tracking-[0.18em] text-[12px]"
            style={{ color: "#eee" }}
          >
            🐙 GITHUB SYNC
          </span>
          <span
            className="font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 rounded"
            style={{
              background: `${dotColor}22`,
              color: dotColor,
              border: `1px solid ${dotColor}55`,
            }}
          >
            {stateLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="font-mono text-[10px] tracking-[0.15em] px-2 py-1 rounded"
          style={{
            background: loading ? "#222" : "#1a1a1a",
            color: "#ddd",
            border: "1px solid #333",
          }}
        >
          {loading ? "…" : "↻ REFRESH"}
        </button>
      </div>

      {status?.owner && status?.repo && (
        <div
          className="font-mono text-[11px] mt-3 truncate"
          style={{ color: "#00bfff" }}
        >
          {status.owner}/{status.repo}
          {status.branch && (
            <span style={{ color: "#777" }}> · {status.branch}</span>
          )}
        </div>
      )}

      {status?.error && (
        <div
          className="font-mono text-[10px] mt-2"
          style={{ color: "#ff8a8a" }}
        >
          ⚠ {status.error}
        </div>
      )}

      {status?.lastCommit && (
        <div className="mt-3">
          <div
            className="font-mono text-[9px] tracking-[0.15em]"
            style={{ color: "#888" }}
          >
            ⬇ LAST PULLED COMMIT
          </div>
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <a
              href={status.lastCommit.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] underline"
              style={{ color: "#39ff14" }}
            >
              {status.lastCommit.shortSha}
            </a>
            <span
              className="font-mono text-[11px] truncate"
              style={{ color: "#ddd" }}
            >
              {status.lastCommit.message}
            </span>
          </div>
          <div
            className="font-mono text-[10px] mt-1"
            style={{ color: "#777" }}
          >
            {status.lastCommit.author} · {relTime(status.lastCommit.date)}
          </div>
        </div>
      )}

      {status?.lastPush?.date && (
        <div className="mt-3">
          <div
            className="font-mono text-[9px] tracking-[0.15em]"
            style={{ color: "#888" }}
          >
            ⬆ LAST PUSHED
          </div>
          <div
            className="font-mono text-[11px] mt-1"
            style={{ color: "#ddd" }}
          >
            {relTime(status.lastPush.date)}
            {status.lastPush.actor && (
              <span style={{ color: "#777" }}> · by {status.lastPush.actor}</span>
            )}
          </div>
        </div>
      )}

      {status && (
        <div
          className="font-mono text-[9px] mt-3"
          style={{ color: "#444" }}
        >
          Updated {relTime(status.fetchedAt)}
        </div>
      )}
    </div>
  );
}