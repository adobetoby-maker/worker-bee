"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type LucideIcon,
  Plus, Search, KeyRound, Globe, Database, Terminal,
  FileCode2, FileText, Copy, Eye, EyeOff, Pencil, Trash2,
  Tag, ExternalLink, ChevronDown, X,
} from "lucide-react";
import type { Credential, CredentialCategory } from "@/lib/vaultStore";

// ── Category config ───────────────────────────────────────
const CATEGORIES: Record<CredentialCategory, { label: string; color: string; icon: LucideIcon }> = {
  "login":    { label: "Login",       color: "bg-blue-900/50 text-blue-300 border-blue-800",     icon: Globe },
  "api-key":  { label: "API Key",     color: "bg-purple-900/50 text-purple-300 border-purple-800", icon: KeyRound },
  "database": { label: "Database",    color: "bg-green-900/50 text-green-300 border-green-800",   icon: Database },
  "ssh":      { label: "SSH",         color: "bg-orange-900/50 text-orange-300 border-orange-800", icon: Terminal },
  "env":      { label: "Env Var",     color: "bg-teal-900/50 text-teal-300 border-teal-800",     icon: FileCode2 },
  "note":     { label: "Secure Note", color: "bg-slate-800 text-slate-300 border-slate-700",     icon: FileText },
};

type SafeCredential = Omit<Credential, "password" | "apiKey">;

function CopyButton({ getValue, label = "Copy" }: { getValue: () => Promise<string | undefined>; label?: string }) {
  const [state, setState] = useState<"idle" | "copied">("idle");
  async function handle() {
    const val = await getValue();
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setState("copied");
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button onClick={handle} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-1 rounded-lg transition-colors">
      <Copy size={11} />
      {state === "copied" ? "Copied!" : label}
    </button>
  );
}

export default function VaultPage() {
  const router = useRouter();
  const [creds, setCreds]       = useState<SafeCredential[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);

  const [query, setQuery]         = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterCategory, setFilterCategory] = useState<CredentialCategory | "">("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [revealedVal, setRevealedVal] = useState("");

  const masterPassword = typeof window !== "undefined" ? sessionStorage.getItem("vault_mp") ?? "" : "";

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterProject)  params.set("project", filterProject);
    if (filterCategory) params.set("category", filterCategory);
    if (query)          params.set("q", query);
    const res = await fetch(`/api/credentials?${params}`);
    if (res.status === 401) { setLoading(false); return; }
    const data = await res.json();
    setCreds(data.credentials ?? []);
    setProjects(data.projects ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [query, filterProject, filterCategory, router]);

  useEffect(() => { load(); }, [load]);

  async function getSecret(id: string): Promise<string | undefined> {
    const res = await fetch(`/api/credentials/${id}`, {
      headers: { "x-master-password": masterPassword },
    });
    if (!res.ok) return undefined;
    const full: Credential = await res.json();
    return full.password ?? full.apiKey ?? full.notes;
  }

  async function revealSecret(id: string) {
    if (revealedId === id) { setRevealedId(null); setRevealedVal(""); return; }
    const val = await getSecret(id);
    if (val) { setRevealedId(id); setRevealedVal(val); }
  }

  async function deleteItem(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await fetch(`/api/credentials/${id}`, {
      method: "DELETE",
      headers: { "x-master-password": masterPassword },
    });
    load();
  }

  const grouped = creds.reduce<Record<string, SafeCredential[]>>((acc, c) => {
    const key = c.project || "Unassigned";
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  const showGrouped = !query && !filterCategory && !filterProject;


  return (
    <div className="-m-8 flex overflow-hidden" style={{ height: '100vh' }}>
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-sm">
            <KeyRound size={16} className="text-indigo-400" />
            Credential Vault
          </div>
          <p className="text-slate-600 text-xs mt-0.5">{total} credentials</p>
        </div>

        <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <button onClick={() => { setFilterProject(""); setFilterCategory(""); }}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!filterProject && !filterCategory ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
            <Globe size={14} /> All Credentials
          </button>

          {projects.length > 0 && (
            <div className="pt-3 pb-1">
              <p className="text-xs text-slate-600 uppercase tracking-wider px-3 mb-1">Projects</p>
              {projects.map(p => (
                <button key={p} onClick={() => { setFilterProject(p); setFilterCategory(""); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors truncate ${filterProject === p ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                  <Tag size={12} className="shrink-0" />
                  <span className="truncate">{p}</span>
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 pb-1">
            <p className="text-xs text-slate-600 uppercase tracking-wider px-3 mb-1">Categories</p>
            {(Object.entries(CATEGORIES) as [CredentialCategory, typeof CATEGORIES[CredentialCategory]][]).map(([key, cat]) => (
              <button key={key} onClick={() => { setFilterCategory(key); setFilterProject(""); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${filterCategory === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <cat.icon size={13} className="shrink-0" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2 pb-4 border-t border-slate-800 pt-3 space-y-1">
          <button onClick={() => router.push("/vault/add")}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors">
            <Plus size={15} /> Add Credential
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Toolbar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search credentials…"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
            {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={14} /></button>}
          </div>
          <button onClick={() => router.push("/vault/add")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={15} /> Add
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500">
            <span className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            Loading…
          </div>
        ) : creds.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <KeyRound size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No credentials found.</p>
            <button onClick={() => router.push("/vault/add")} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm underline">Add your first credential</button>
          </div>
        ) : showGrouped ? (
          // Grouped by project
          Object.entries(grouped).sort(([a], [b]) => a === "Unassigned" ? 1 : a.localeCompare(b)).map(([proj, items]) => (
            <div key={proj} className="mb-6">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Tag size={11} /> {proj}
                <span className="text-slate-600 normal-case font-normal">({items.length})</span>
              </h2>
              <CredList items={items} revealedId={revealedId} revealedVal={revealedVal} masterPassword={masterPassword} onReveal={revealSecret} onDelete={deleteItem} onEdit={id => router.push(`/vault/edit?id=${id}`)} getSecret={getSecret} expandedId={expandedId} onExpand={setExpandedId} />
            </div>
          ))
        ) : (
          <CredList items={creds} revealedId={revealedId} revealedVal={revealedVal} masterPassword={masterPassword} onReveal={revealSecret} onDelete={deleteItem} onEdit={id => router.push(`/vault/edit?id=${id}`)} getSecret={getSecret} expandedId={expandedId} onExpand={setExpandedId} />
        )}
      </main>
    </div>
  );
}

// ── Credential card list ──────────────────────────────────
function CredList({ items, revealedId, revealedVal, masterPassword, onReveal, onDelete, onEdit, getSecret, expandedId, onExpand }: {
  items: SafeCredential[];
  revealedId: string | null;
  revealedVal: string;
  masterPassword: string;
  onReveal: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onEdit: (id: string) => void;
  getSecret: (id: string) => Promise<string | undefined>;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map(c => {
        const cat = CATEGORIES[c.category];
        const CatIcon = cat.icon;
        const expanded = expandedId === c.id;
        const revealed = revealedId === c.id;

        return (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                <CatIcon size={15} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-white truncate">{c.title}</p>
                  <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full shrink-0 ${cat.color}`}>{cat.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {c.username && <span className="text-xs text-slate-500 truncate">{c.username}</span>}
                  {c.site && (
                    <a href={c.site.startsWith("http") ? c.site : `https://${c.site}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-slate-600 hover:text-indigo-400 flex items-center gap-0.5 transition-colors">
                      <ExternalLink size={10} />{c.site.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Copy secret */}
                <CopyButton getValue={() => getSecret(c.id)} label={c.category === "api-key" ? "Copy Key" : "Copy PW"} />
                {/* Reveal */}
                <button onClick={() => onReveal(c.id)} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                {/* Edit */}
                <button onClick={() => onEdit(c.id)} className="text-slate-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  <Pencil size={14} />
                </button>
                {/* Delete */}
                <button onClick={() => onDelete(c.id, c.title)} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  <Trash2 size={14} />
                </button>
                {/* Expand */}
                <button onClick={() => onExpand(expanded ? null : c.id)} className="text-slate-600 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Revealed secret */}
            {revealed && (
              <div className="px-4 pb-3 -mt-1">
                <div className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-green-400 break-all select-all">
                  {revealedVal}
                </div>
              </div>
            )}

            {/* Expanded details */}
            {expanded && (
              <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400 space-y-1.5">
                {c.host && <p><span className="text-slate-600">Host:</span> {c.host}{c.port ? `:${c.port}` : ""}</p>}
                {c.database && <p><span className="text-slate-600">Database:</span> {c.database}</p>}
                {c.tags?.length ? <p><span className="text-slate-600">Tags:</span> {c.tags.join(", ")}</p> : null}
                {c.notes && <p className="text-slate-500 italic leading-relaxed">{c.notes}</p>}
                <p className="text-slate-700">Added {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
