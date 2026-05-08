"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowLeft, Save, AlertCircle } from "lucide-react";
import type { CredentialCategory } from "@/lib/vaultStore";

const CATEGORIES: { value: CredentialCategory; label: string }[] = [
  { value: "login",    label: "Website Login" },
  { value: "api-key",  label: "API Key" },
  { value: "database", label: "Database" },
  { value: "ssh",      label: "SSH / Server" },
  { value: "env",      label: "Environment Variable" },
  { value: "note",     label: "Secure Note" },
];

export default function AddCredentialPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "login" as CredentialCategory,
    site: "",
    project: "",
    username: "",
    password: "",
    apiKey: "",
    host: "",
    port: "",
    database: "",
    notes: "",
    tags: "",
  });

  function field(key: keyof typeof form, label: string, opts?: { type?: string; placeholder?: string; multiline?: boolean }) {
    return (
      <div key={key}>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
        {opts?.multiline ? (
          <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={opts?.placeholder}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 resize-y" />
        ) : (
          <input type={opts?.type ?? "text"} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={opts?.placeholder}
            autoComplete={key === "password" ? "new-password" : undefined}
            className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
        )}
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { setError("Title is required"); return; }

    const mp = sessionStorage.getItem("vault_mp");
    if (!mp) { router.replace("/vault"); return; }

    setSaving(true); setError("");
    const body = {
      ...form,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-master-password": mp },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push("/vault");
    } else {
      const d = await res.json();
      setError(d.error ?? "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <KeyRound size={20} className="text-indigo-400" />
          Add Credential
        </h1>
      </div>

      <form onSubmit={save} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as CredentialCategory }))}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 appearance-none">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {field("title", "Title *", { placeholder: "e.g. JRS Admin Login" })}
          {field("project", "Project / Site Name", { placeholder: "e.g. JRS Auto Repair" })}
        </div>

        {["login", "database", "ssh"].includes(form.category) && (
          <div className="grid sm:grid-cols-2 gap-5">
            {field("site", "URL / Domain", { placeholder: "https://example.com" })}
            {field("username", "Username / Email", { placeholder: "admin@example.com" })}
          </div>
        )}

        {form.category === "api-key" && (
          <div className="grid sm:grid-cols-2 gap-5">
            {field("site", "Service URL", { placeholder: "https://api.anthropic.com" })}
            {field("username", "Account / Label", { placeholder: "Production key" })}
          </div>
        )}

        {["login", "ssh"].includes(form.category) && field("password", "Password", { type: "password", placeholder: "••••••••" })}
        {form.category === "api-key" && field("apiKey", "API Key", { type: "password", placeholder: "sk-ant-..." })}

        {["database", "ssh"].includes(form.category) && (
          <div className="grid sm:grid-cols-3 gap-5">
            {field("host", "Host", { placeholder: "db.example.com" })}
            {field("port", "Port", { placeholder: "5432" })}
            {form.category === "database" && field("database", "Database Name", { placeholder: "mydb" })}
          </div>
        )}

        {form.category === "database" && (
          <div className="grid sm:grid-cols-2 gap-5">
            {field("username", "Username", { placeholder: "postgres" })}
            {field("password", "Password", { type: "password", placeholder: "••••••••" })}
          </div>
        )}

        {form.category === "env" && (
          <div className="grid sm:grid-cols-2 gap-5">
            {field("username", "Variable Name", { placeholder: "ANTHROPIC_API_KEY" })}
            {field("apiKey", "Value", { type: "password", placeholder: "sk-ant-..." })}
          </div>
        )}

        {field("notes", "Notes", { multiline: true, placeholder: "Any additional context…" })}

        <div className="grid sm:grid-cols-2 gap-5">
          {field("tags", "Tags (comma-separated)", { placeholder: "production, client, vercel" })}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/60 border border-red-900 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            {saving ? "Saving…" : "Save Credential"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
