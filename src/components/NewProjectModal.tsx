import { useState } from "react";
import { createProject, type ProjectStatus, STATUS_META } from "@/lib/projects";

const EMOJIS = ["🌐", "🏠", "🛍", "🎨", "📰", "🎮", "🏢", "💼", "🍕", "🎵"];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
  tabs: { id: string; name: string }[];
}

export function NewProjectModal({ open, onClose, onCreated, tabs }: Props) {
  const [emoji, setEmoji] = useState("🌐");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [description, setDescription] = useState("");
  const [assignedTabId, setAssignedTabId] = useState<string>("");

  if (!open) return null;

  const submit = () => {
    if (!name.trim()) return;
    const proj = createProject({
      emoji,
      name: name.trim(),
      client: client.trim() || undefined,
      targetUrl: targetUrl.trim() || undefined,
      status,
      description: description.trim() || undefined,
      assignedTabId: assignedTabId || null,
    });
    onCreated(proj.id, proj.name);
    // Reset
    setEmoji("🌐");
    setName("");
    setClient("");
    setTargetUrl("");
    setStatus("planning");
    setDescription("");
    setAssignedTabId("");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "#000000cc", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-5 w-[480px] max-w-[92vw] max-h-[90vh] overflow-y-auto"
        style={{ background: "#0a0a0a", border: "1px solid #ffaa0040" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="font-mono text-[13px] tracking-[0.15em] mb-4"
          style={{ color: "#ffaa00" }}
        >
          📂 NEW HIVE PROJECT
        </div>

        <Field label="EMOJI">
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className="w-8 h-8 rounded text-base flex items-center justify-center transition"
                style={{
                  background: emoji === e ? "#ffaa0022" : "transparent",
                  border: emoji === e ? "1px solid #ffaa00" : "1px solid #222",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label="PROJECT NAME">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp Site"
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CLIENT (OPTIONAL)">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Acme Inc"
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono"
            />
          </Field>
          <Field label="TARGET URL (OPTIONAL)">
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://acme.com"
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="STATUS">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono"
            >
              {(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ASSIGN TO AGENT">
            <select
              value={assignedTabId}
              onChange={(e) => setAssignedTabId(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono"
            >
              <option value="">— None —</option>
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="DESCRIPTION">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building?"
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] font-mono resize-none"
          />
        </Field>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border font-mono text-[11px]"
            style={{ borderColor: "#333", color: "#888" }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded font-mono text-[11px] tracking-[0.15em]"
            style={{
              background: name.trim() ? "#ffaa00" : "#333",
              color: name.trim() ? "#000" : "#666",
              cursor: name.trim() ? "pointer" : "not-allowed",
            }}
          >
            🐝 CREATE PROJECT
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div
        className="font-mono text-[10px] tracking-[0.15em] mb-1"
        style={{ color: "#777" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
