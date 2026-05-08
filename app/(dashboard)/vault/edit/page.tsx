"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import type { Credential, CredentialCategory } from "@/lib/vaultStore";

function EditForm() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState<Partial<Credential>>({});

  useEffect(() => {
    if (!id) { router.replace("/vault"); return; }
    const mp = sessionStorage.getItem("vault_mp");
    if (!mp) { router.replace("/vault"); return; }
    fetch(`/api/credentials/${id}`, { headers: { "x-master-password": mp } })
      .then(r => r.json())
      .then(d => { setForm(d); setLoading(false); });
  }, [id, router]);

  const f = (key: keyof Credential, label: string, opts?: { type?: string; placeholder?: string; multiline?: boolean }) => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {opts?.multiline ? (
        <textarea value={(form[key] as string) ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder} rows={3}
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 resize-y" />
      ) : (
        <input type={opts?.type ?? "text"} value={(form[key] as string) ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          autoComplete={key === "password" ? "new-password" : undefined}
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
      )}
    </div>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const mp = sessionStorage.getItem("vault_mp");
    if (!mp) { router.replace("/vault"); return; }
    setSaving(true); setError("");
    const updates = { ...form };
    delete (updates as Partial<Credential>).id;
    delete (updates as Partial<Credential>).createdAt;
    const res = await fetch(`/api/credentials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-master-password": mp },
      body: JSON.stringify(updates),
    });
    if (res.ok) router.push("/vault");
    else { const d = await res.json(); setError(d.error ?? "Save failed"); setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center text-slate-500 gap-2 py-12">
      <span className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
      Loading…
    </div>
  );

  const cat = form.category as CredentialCategory;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-extrabold text-white">Edit Credential</h1>
      </div>

      <form onSubmit={save} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          {f("title", "Title *")}
          {f("project", "Project / Site Name")}
        </div>
        {f("site", "URL / Domain")}
        {f("username", cat === "env" ? "Variable Name" : "Username / Email")}
        {(cat === "login" || cat === "database" || cat === "ssh") && f("password", "Password", { type: "password", placeholder: "Leave blank to keep current" })}
        {(cat === "api-key" || cat === "env") && f("apiKey", cat === "env" ? "Value" : "API Key", { type: "password", placeholder: "Leave blank to keep current" })}
        {(cat === "database" || cat === "ssh") && (
          <div className="grid sm:grid-cols-3 gap-5">
            {f("host", "Host")} {f("port", "Port")} {cat === "database" && f("database", "Database")}
          </div>
        )}
        {f("notes", "Notes", { multiline: true })}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} />{error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.back()} className="text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default function EditPage() {
  return <Suspense fallback={<div className="py-12 text-slate-600 text-sm">Loading…</div>}><EditForm /></Suspense>;
}
