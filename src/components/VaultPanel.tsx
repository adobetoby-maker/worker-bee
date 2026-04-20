import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  exportBackup,
  generatePassword,
  getLockoutRemaining,
  importBackup,
  initVault,
  passwordStrength,
  savePots,
  unlockVault,
  vaultExists,
  type Category,
  type HoneyPot,
  type VaultSession,
} from "@/lib/vault";
import { setVaultSnapshot } from "@/lib/vault-snapshot";
import { emitActivity } from "@/lib/activity-feed";
import {
  setUnlockedPots,
  clearUnlockedPots,
  subscribeAccessLog,
  clearAccessLog,
  type AccessEvent,
} from "@/lib/credential-proxy";
import {
  loadLockTimeoutMinutes,
  saveLockTimeoutMinutes,
  startAutoLock,
  resetAutoLock,
  stopAutoLock,
  type LockTimeout,
} from "@/lib/vault-autolock";
import {
  subscribeInjection,
  injectPot,
  getInjectionForPot,
} from "@/lib/injection-registry";

const EMOJIS = ["🐝","🍯","🔑","🗝","🛡","⚡","🌐","📧","💬","🐙","🦊","🦁","🐺","🎭","🎪","🚀","🔮","🧪","🦋","🌶"];
const CATEGORIES: Category[] = ["EMAIL", "SOCIAL", "HOSTING", "API", "DATABASE", "OTHER"];
const STRENGTH_LABELS = ["EMPTY", "WEAK", "FAIR", "STRONG", "FORTRESS"];
const STRENGTH_COLORS = ["#333", "#ff3b3b", "#ff8a00", "#ffaa00", "#39ff14"];

interface Props {
  onInject: (label: string) => void;
}

export function VaultPanel({ onInject }: Props) {
  const [session, setSession] = useState<VaultSession | null>(null);
  const [exists, setExists] = useState<boolean>(() => vaultExists());

  if (!session) {
    return (
      <LockScreen
        exists={exists}
        onUnlocked={(s) => {
          setSession(s);
          setExists(true);
        }}
      />
    );
  }

  return (
    <Dashboard
      session={session}
      onLock={() => setSession(null)}
      onInject={onInject}
    />
  );
}

// ---------- LOCK / INIT SCREEN ----------

function LockScreen({
  exists,
  onUnlocked,
}: {
  exists: boolean;
  onUnlocked: (s: VaultSession) => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(getLockoutRemaining());

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const id = setInterval(() => {
      const r = getLockoutRemaining();
      setLockSeconds(r);
      if (r === 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [lockSeconds]);

  const submit = async () => {
    setErr(null);
    if (!pw) return setErr("Master password required");
    if (!exists && pw !== confirm) return setErr("Passwords do not match");
    if (!exists && pw.length < 8) return setErr("Use at least 8 characters");
    setBusy(true);
    try {
      const s = exists ? await unlockVault(pw) : await initVault(pw);
      toast.success(exists ? "🐝 Hive unlocked" : "🍯 Hive sealed and ready");
      onUnlocked(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("LOCKED:")) {
        const secs = parseInt(msg.split(":")[1], 10);
        setLockSeconds(secs);
        setErr(`🚨 Too many attempts. Vault locked for ${secs} seconds.`);
      } else if (msg.startsWith("WRONG:")) {
        const left = msg.split(":")[1];
        setErr(`Wrong password. ${left} attempt${left === "1" ? "" : "s"} remaining.`);
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const isLocked = lockSeconds > 0;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 bg-background/80 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-lg border border-primary/30 bg-surface/80 p-8 shadow-[0_0_60px_-20px_var(--primary)]"
        style={{ animation: "var(--animate-slide-down)" }}
      >
        <div className="text-center mb-6">
          <div style={{ fontSize: 64, lineHeight: 1 }}>🔒</div>
          <h2 className="mt-4 font-mono text-lg uppercase tracking-[0.2em] text-primary">
            {exists ? "Unlock the Hive" : "Initialize the Hive Vault"}
          </h2>
          <p className="mt-2 font-sans text-xs text-muted-foreground leading-relaxed">
            Your credentials never leave this device.<br />
            AES-256 encrypted. Master password is never stored.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
              {exists ? "Master Password" : "Set Master Password"}
            </label>
            <input
              type="password"
              autoFocus
              disabled={isLocked || busy}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </div>
          {!exists && (
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                Confirm Master Password
              </label>
              <input
                type="password"
                disabled={busy}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {err && (
            <div className="font-mono text-[11px] text-destructive bg-destructive/10 border border-destructive/40 rounded px-3 py-2">
              {err}
              {isLocked && <span> ({lockSeconds}s)</span>}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || isLocked}
            className="w-full mt-2 py-3 rounded font-mono text-xs uppercase tracking-[0.25em] bg-gradient-to-br from-primary to-[#ffcc40] text-primary-foreground disabled:opacity-40 hover:shadow-[0_0_24px_-4px_var(--primary)]"
          >
            {isLocked
              ? `🔒 LOCKED (${lockSeconds}s)`
              : busy
                ? "⏳ Working..."
                : exists
                  ? "UNLOCK"
                  : "🐝 SEAL THE HIVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- DASHBOARD ----------

function Dashboard({
  session,
  onLock,
  onInject,
}: {
  session: VaultSession;
  onLock: () => void;
  onInject: (label: string) => void;
}) {
  const [pots, setPots] = useState<HoneyPot[]>(session.pots);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<HoneyPot | null>(null);
  const [adding, setAdding] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVaultSnapshot(pots.map((p) => ({ id: p.id, emoji: p.emoji, service: p.service })));
  }, [pots]);
  useEffect(() => () => setVaultSnapshot([]), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pots;
    return pots.filter(
      (p) =>
        p.service.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [pots, query]);

  const persistPots = async (next: HoneyPot[]) => {
    setPots(next);
    session.pots = next;
    await savePots(session);
  };

  const handleSave = async (pot: HoneyPot) => {
    const exists = pots.find((p) => p.id === pot.id);
    const next = exists
      ? pots.map((p) => (p.id === pot.id ? pot : p))
      : [...pots, pot];
    await persistPots(next);
    setEditing(null);
    setAdding(false);
    toast.success(`🍯 ${pot.service} stored in hive`);
  };

  const handleDelete = async (pot: HoneyPot) => {
    if (!confirm(`Delete "${pot.service}"? This cannot be undone.`)) return;
    await persistPots(pots.filter((p) => p.id !== pot.id));
    toast(`🗑 ${pot.service} removed`);
  };

  const handleExport = () => {
    const data = exportBackup();
    if (!data) return toast.error("Nothing to export");
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `worker-bee-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📦 Encrypted backup exported");
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      importBackup(text);
      toast.success("📥 Backup imported. Re-enter master password to unlock.");
      onLock();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  const showPanel = adding || !!editing;

  return (
    <div className="relative flex flex-1 min-h-0 flex-col">
      <div className="flex flex-1 min-h-0 flex-col px-6 py-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-[0.18em] text-primary">
              🍯 THE HIVE VAULT
            </h1>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {pots.length} honey pot{pots.length === 1 ? "" : "s"} guarded by AES-256
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="px-3 py-2 rounded font-mono text-[11px] uppercase tracking-[0.2em] bg-gradient-to-br from-primary to-[#ffcc40] text-primary-foreground hover:shadow-[0_0_18px_-4px_var(--primary)]"
            >
              + ADD HONEY POT
            </button>
            <button
              type="button"
              onClick={onLock}
              className="px-3 py-2 rounded font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground border border-border hover:text-foreground hover:border-foreground/40"
            >
              🔒 LOCK
            </button>
          </div>
        </div>

        <div className="relative mb-5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your honey pots..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded font-mono text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center font-mono text-xs text-muted-foreground">
              <div style={{ fontSize: 56 }}>🍯</div>
              <p className="mt-3 uppercase tracking-[0.2em]">
                {pots.length === 0 ? "Hive is empty" : "No matches"}
              </p>
              {pots.length === 0 && (
                <p className="mt-1 normal-case tracking-normal text-[11px]">
                  Add your first honey pot to begin.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((pot) => (
              <PotCard
                key={pot.id}
                pot={pot}
                onEdit={() => setEditing(pot)}
                onDelete={() => handleDelete(pot)}
                onInject={() => {
                  emitActivity({ kind: "vault", icon: "🍯", text: `${pot.service} · injected` });
                  onInject(pot.service);
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border font-mono text-[10px] text-muted-foreground/70 leading-relaxed">
          🔐 AES-256-GCM encrypted · Stored locally · Never transmitted
          <br />
          Master password is never saved — losing it means losing access.
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-2 py-1 border border-border rounded hover:border-primary/50 hover:text-primary"
            >
              EXPORT ENCRYPTED BACKUP
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-2 py-1 border border-border rounded hover:border-primary/50 hover:text-primary"
            >
              IMPORT BACKUP
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {showPanel && (
        <PotForm
          initial={editing ?? undefined}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ---------- POT CARD ----------

function PotCard({
  pot,
  onEdit,
  onDelete,
  onInject,
}: {
  pot: HoneyPot;
  onEdit: () => void;
  onDelete: () => void;
  onInject: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => setRevealed(false), 5000);
    return () => clearTimeout(id);
  }, [revealed]);

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded border border-border bg-surface/60 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div style={{ fontSize: 32, lineHeight: 1 }}>{pot.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-bold text-primary truncate">{pot.service}</div>
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-[0.15em] border border-primary/40 text-primary/80 bg-primary/5">
            {pot.category}
          </span>
        </div>
      </div>

      <div className="font-mono text-xs text-muted-foreground truncate" title={pot.username}>
        {pot.username || "—"}
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs px-2 py-1 bg-background border border-border rounded truncate">
          {revealed ? pot.password : "•".repeat(Math.min(pot.password.length, 14))}
        </code>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          title={revealed ? "Hide (auto in 5s)" : "Reveal for 5s"}
          className="px-2 py-1 text-xs border border-border rounded hover:border-primary/50 hover:text-primary"
        >
          👁
        </button>
      </div>

      {pot.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pot.tags.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-background border border-border text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {pot.notes && (
        <div className="font-sans text-[11px] text-muted-foreground italic line-clamp-2">
          {pot.notes}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <button
          type="button"
          onClick={onInject}
          className="flex-1 px-2 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.2em] bg-gradient-to-br from-primary/80 to-[#ffcc40] text-primary-foreground hover:shadow-[0_0_14px_-4px_var(--primary)]"
        >
          💉 INJECT
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="px-2 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.2em] border border-border hover:border-primary/50 hover:text-primary"
        >
          ✏ EDIT
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-2 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.2em] border border-border hover:border-destructive/60 hover:text-destructive"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ---------- ADD / EDIT FORM (slide-in panel from right) ----------

function PotForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: HoneyPot;
  onCancel: () => void;
  onSave: (pot: HoneyPot) => void;
}) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJIS[0]);
  const [service, setService] = useState(initial?.service ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "OTHER");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [showPw, setShowPw] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(", ") ?? "");

  const strength = passwordStrength(password);

  const submit = () => {
    if (!service.trim()) return toast.error("Service name required");
    if (!password) return toast.error("Password required");
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      emoji,
      service: service.trim(),
      category,
      username: username.trim(),
      password,
      notes: notes.trim() || undefined,
      tags,
      createdAt: initial?.createdAt ?? Date.now(),
    });
  };

  return (
    <>
      <div className="absolute inset-0 bg-background/60 z-10" onClick={onCancel} />
      <div
        className="absolute right-0 top-0 bottom-0 z-20 w-[340px] bg-surface border-l border-primary/40 overflow-y-auto"
        style={{ animation: "slide-in-right 240ms ease-out" }}
      >
        <style>{`@keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-primary">
              {initial ? "Edit Honey Pot" : "New Honey Pot"}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground text-lg"
            >
              ×
            </button>
          </div>

          <div>
            <Label>Emoji</Label>
            <div className="grid grid-cols-10 gap-1 mt-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-lg p-1 rounded ${emoji === e ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-surface-2"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Service Name</Label>
            <Input value={service} onChange={setService} placeholder="Gmail Production" />
          </div>

          <div>
            <Label>Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:border-primary focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Username / Email</Label>
            <Input value={username} onChange={setUsername} placeholder="you@example.com" />
          </div>

          <div>
            <Label>Password</Label>
            <div className="flex items-center gap-1">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="px-2 py-2 border border-border rounded text-xs hover:border-primary/50"
              >
                👁
              </button>
              <button
                type="button"
                onClick={() => {
                  setPassword(generatePassword(20));
                  setShowPw(true);
                }}
                className="px-2 py-2 border border-primary/40 text-primary rounded text-[10px] font-mono uppercase tracking-[0.15em] hover:bg-primary/10"
                title="Generate strong password"
              >
                ⚡ GEN
              </button>
            </div>
            {/* Strength meter */}
            <div className="flex gap-1 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded"
                  style={{
                    background: i < strength ? STRENGTH_COLORS[strength] : "#222",
                    transition: "background 200ms ease",
                  }}
                />
              ))}
            </div>
            <div
              className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: STRENGTH_COLORS[strength] }}
            >
              {STRENGTH_LABELS[strength]}
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="2FA on phone, recovery codes in safe…"
              className="w-full px-3 py-2 bg-background border border-border rounded font-sans text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={tagsInput} onChange={setTagsInput} placeholder="work, client-abc" />
          </div>

          <button
            type="button"
            onClick={submit}
            className="w-full mt-2 py-3 rounded font-mono text-xs uppercase tracking-[0.25em] bg-gradient-to-br from-primary to-[#ffcc40] text-primary-foreground hover:shadow-[0_0_24px_-4px_var(--primary)]"
          >
            🐝 STORE IN HIVE
          </button>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:border-primary focus:outline-none"
    />
  );
}
