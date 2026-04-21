import { useEffect, useState } from "react";
import { sendGmail, subscribeAgentWS, isWSOpen } from "@/lib/agent-ws";
import {
  GMAIL_CATEGORIES,
  type GmailCategoryCount,
  type GmailCategoryId,
  type GmailEmailPreview,
  type GmailTopSender,
} from "@/lib/gmail-protocol";
import { toast } from "sonner";

const AMBER = "#ffaa00";
const GREEN = "#39ff14";
const RED = "#ff3b3b";

interface Props {
  tabId: string;
  onBack: () => void;
}

type Step = "scan" | "results";

interface Confirm {
  op: "archive" | "delete";
  category?: GmailCategoryId;
  sender?: string;
  count: number;
  label: string;
}

interface Progress {
  op: "archive" | "delete";
  processed: number;
  total: number;
  label?: string;
  done?: boolean;
}

function categoryMeta(id: GmailCategoryId) {
  return GMAIL_CATEGORIES.find((c) => c.id === id);
}

export function InboxCleaner({ tabId, onBack }: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [scanning, setScanning] = useState(false);
  const [counts, setCounts] = useState<GmailCategoryCount[]>([]);
  const [preview, setPreview] = useState<{ category: GmailCategoryId; items: GmailEmailPreview[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState<GmailCategoryId | null>(null);
  const [topSenders, setTopSenders] = useState<GmailTopSender[] | null>(null);
  const [topLoading, setTopLoading] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const unsub = subscribeAgentWS(tabId, {
      onGmailSummary: ({ categories }) => {
        setCounts(categories);
        setScanning(false);
        setStep("results");
      },
      onGmailPreview: (info) => {
        setPreviewLoading(null);
        setPreview(info);
      },
      onGmailTopSenders: ({ senders }) => {
        setTopLoading(false);
        setTopSenders(senders);
      },
      onGmailProgress: (p) => {
        setProgress({ op: p.op, processed: p.processed, total: p.total, label: p.label });
      },
      onGmailDone: ({ op, processed, ok, message }) => {
        setProgress((prev) => prev ? { ...prev, processed, done: true } : { op, processed, total: processed, done: true });
        if (ok) {
          toast.success(`✅ Done — ${op === "archive" ? "archived" : "moved to Trash"} ${processed} email${processed === 1 ? "" : "s"}`, { duration: 3000 });
        } else {
          toast.error(`Failed: ${message ?? "unknown error"}`);
        }
        // Refresh counts after action.
        if (ok && isWSOpen(tabId)) sendGmail(tabId, { gmail_action: "summary" });
        setTimeout(() => setProgress(null), 1500);
      },
    });
    return unsub;
  }, [tabId]);

  const startScan = () => {
    if (!isWSOpen(tabId)) {
      toast.error("Agent WebSocket not connected — open CONFIG");
      return;
    }
    setScanning(true);
    sendGmail(tabId, { gmail_action: "summary" });
  };

  const requestPreview = (category: GmailCategoryId) => {
    if (!isWSOpen(tabId)) return;
    setPreviewLoading(category);
    setPreview(null);
    sendGmail(tabId, { gmail_action: "preview", category, limit: 20 });
  };

  const requestTopSenders = () => {
    if (!isWSOpen(tabId)) return;
    setTopLoading(true);
    sendGmail(tabId, { gmail_action: "top_senders", limit: 20 });
  };

  const askConfirm = (op: "archive" | "delete", category: GmailCategoryId, count: number) => {
    const meta = categoryMeta(category);
    setConfirm({ op, category, count, label: `${meta?.icon ?? ""} ${meta?.name ?? category}` });
  };

  const askConfirmSender = (op: "archive" | "delete", sender: GmailTopSender) => {
    setConfirm({ op, sender: sender.email, count: sender.count, label: sender.email });
  };

  const runConfirmed = () => {
    if (!confirm) return;
    const { op, category, sender, count } = confirm;
    setProgress({ op, processed: 0, total: count, label: confirm.label });
    sendGmail(tabId, { gmail_action: op, category, sender });
    setConfirm(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 gap-6 font-mono">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold tracking-[0.18em]" style={{ color: AMBER, fontSize: 22 }}>
            🧹 INBOX CLEANER
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "#888" }}>
            Review before anything is deleted
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded"
          style={{ background: "transparent", color: "#aaa", border: "1px solid #333" }}
        >
          ← BACK TO CHAT
        </button>
      </header>

      {/* STEP 1 — SCAN */}
      {step === "scan" && (
        <div className="flex justify-center pt-12">
          <div
            className="rounded-lg p-8 max-w-xl w-full text-center flex flex-col items-center gap-5"
            style={{ background: "#0d0d0d", border: `1px solid ${AMBER}55` }}
          >
            <div style={{ fontSize: 18, color: AMBER }}>📊 Scan your inbox first</div>
            <p className="text-[12px] leading-relaxed" style={{ color: "#aaa" }}>
              Worker Bee will count emails by category.<br />
              Nothing is deleted until you approve.
            </p>
            <button
              type="button"
              onClick={startScan}
              disabled={scanning}
              className="text-[12px] uppercase tracking-[0.18em] px-6 py-3 rounded disabled:opacity-50"
              style={{ background: AMBER, color: "#000", fontWeight: 700 }}
            >
              {scanning ? "⏳ Scanning inbox..." : "🔍 SCAN INBOX"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — RESULTS */}
      {step === "results" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GMAIL_CATEGORIES.map((cat) => {
              const c = counts.find((x) => x.id === cat.id);
              const count = c?.count ?? 0;
              return (
                <div
                  key={cat.id}
                  className="rounded-lg p-4 flex flex-col gap-3"
                  style={{ background: "#0d0d0d", border: `1px solid ${AMBER}33` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <span className="text-[13px] tracking-[0.12em]" style={{ color: "#ddd" }}>
                        {cat.name}
                      </span>
                    </div>
                    <span style={{ color: AMBER, fontSize: 28, fontWeight: 700 }}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                  {(cat.canArchive || cat.canDelete) && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => requestPreview(cat.id)}
                        disabled={previewLoading === cat.id || count === 0}
                        className="text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded disabled:opacity-40"
                        style={{ background: "transparent", color: "#aaa", border: "1px solid #333" }}
                      >
                        {previewLoading === cat.id ? "..." : "PREVIEW 20"}
                      </button>
                      {cat.canArchive && (
                        <button
                          type="button"
                          onClick={() => askConfirm("archive", cat.id, count)}
                          disabled={count === 0}
                          className="text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded disabled:opacity-40"
                          style={{ background: AMBER, color: "#000", fontWeight: 700 }}
                        >
                          ARCHIVE ALL
                        </button>
                      )}
                      {cat.canDelete && (
                        <button
                          type="button"
                          onClick={() => askConfirm("delete", cat.id, count)}
                          disabled={count === 0}
                          className="text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded disabled:opacity-40"
                          style={{ background: RED, color: "#000", fontWeight: 700 }}
                        >
                          DELETE ALL
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PREVIEW PANEL */}
          {preview && (
            <div
              className="rounded-lg p-4"
              style={{ background: "#0a0a0a", border: "1px solid #222" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] tracking-[0.14em]" style={{ color: AMBER }}>
                  PREVIEW — {categoryMeta(preview.category)?.name} ({preview.items.length})
                </span>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="text-[10px] uppercase tracking-[0.16em]"
                  style={{ color: "#888" }}
                >
                  close ✕
                </button>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {preview.items.length === 0 && (
                  <div className="text-[11px]" style={{ color: "#666" }}>No emails returned.</div>
                )}
                {preview.items.map((it) => (
                  <div key={it.id} className="text-[11px] py-1" style={{ color: "#bbb", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ color: "#ddd" }}>{it.subject || "(no subject)"}</div>
                    <div style={{ color: "#777" }}>{it.from}{it.date ? ` · ${it.date}` : ""}</div>
                    {it.snippet && <div className="mt-0.5" style={{ color: "#666" }}>{it.snippet}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP SENDERS */}
          <div
            className="rounded-lg p-4"
            style={{ background: "#0d0d0d", border: `1px solid ${AMBER}33` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] tracking-[0.14em]" style={{ color: AMBER }}>
                👑 TOP SENDERS CLOGGING YOUR INBOX
              </span>
              <button
                type="button"
                onClick={requestTopSenders}
                disabled={topLoading}
                className="text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded disabled:opacity-40"
                style={{ background: AMBER, color: "#000", fontWeight: 700 }}
              >
                {topLoading ? "..." : topSenders ? "REFRESH" : "FIND TOP SENDERS"}
              </button>
            </div>
            {topSenders && topSenders.length === 0 && (
              <div className="text-[11px]" style={{ color: "#666" }}>No data.</div>
            )}
            {topSenders && topSenders.length > 0 && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {topSenders.map((s) => (
                  <div
                    key={s.email}
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: "1px solid #1a1a1a" }}
                  >
                    <div className="text-[11px]" style={{ color: "#bbb" }}>
                      <span style={{ color: "#ddd" }}>From:</span> {s.email}
                      {s.name && <span style={{ color: "#666" }}> ({s.name})</span>}
                      <span style={{ color: AMBER, marginLeft: 8 }}>· {s.count} emails</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => askConfirmSender("archive", s)}
                      className="text-[10px] uppercase tracking-[0.16em] px-3 py-1 rounded"
                      style={{ background: AMBER, color: "#000", fontWeight: 700 }}
                    >
                      ARCHIVE ALL FROM THIS SENDER
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* SAFETY RULES */}
      <div
        className="text-[12px] leading-relaxed mt-auto pt-4"
        style={{ color: "var(--muted-foreground, #777)", fontFamily: '"IBM Plex Sans", sans-serif', borderTop: "1px solid #1a1a1a" }}
      >
        🔒 Worker Bee never permanently deletes without moving to Trash first.
        Trash emails are kept for 30 days.
        Archive keeps emails in All Mail forever.
      </div>

      {/* STEP 3 — CONFIRM MODAL */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setConfirm(null)}
        >
          <div
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{ background: "#1a0000", border: `1px solid ${RED}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[14px] tracking-[0.14em] mb-3" style={{ color: AMBER }}>
              ⚠ CONFIRM ACTION
            </div>
            <p className="text-[12px] leading-relaxed mb-4" style={{ color: "#ddd" }}>
              You are about to <strong style={{ color: confirm.op === "delete" ? RED : AMBER }}>{confirm.op}</strong>{" "}
              ~{confirm.count.toLocaleString()} email{confirm.count === 1 ? "" : "s"} from{" "}
              <strong style={{ color: "#fff" }}>{confirm.label}</strong>.
            </p>
            <p className="text-[11px] leading-relaxed mb-5" style={{ color: "#888" }}>
              {confirm.op === "delete"
                ? "This moves messages to Trash. Trash retains them 30 days before permanent deletion."
                : "Archives can be found in All Mail."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="text-[10px] uppercase tracking-[0.18em] px-4 py-2 rounded"
                style={{ background: "transparent", color: "#aaa", border: "1px solid #333" }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={runConfirmed}
                className="text-[10px] uppercase tracking-[0.18em] px-4 py-2 rounded"
                style={{ background: confirm.op === "delete" ? RED : AMBER, color: "#000", fontWeight: 700 }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — PROGRESS */}
      {progress && (
        <div
          className="fixed bottom-6 right-6 z-40 rounded-lg p-4 min-w-[320px]"
          style={{ background: "#0d0d0d", border: `1px solid ${progress.done ? GREEN : AMBER}` }}
        >
          <div className="text-[11px] tracking-[0.14em] mb-2" style={{ color: progress.done ? GREEN : AMBER }}>
            {progress.done
              ? `✅ Done — ${progress.op === "archive" ? "archived" : "moved to Trash"} ${progress.processed} emails`
              : `${progress.op === "archive" ? "Archiving" : "Deleting"} ${progress.label ?? ""}...`}
          </div>
          {!progress.done && (
            <>
              <div className="text-[10px]" style={{ color: "#888", marginBottom: 4 }}>
                {progress.processed} / {progress.total}
              </div>
              <div style={{ background: "#1a1a1a", height: 6, borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progress.total > 0 ? Math.min(100, (progress.processed / progress.total) * 100) : 0}%`,
                    background: AMBER,
                    height: "100%",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}