/**
 * Per-row vault store backed by Supabase `credentials` table.
 * Sensitive fields are AES-256-GCM encrypted; plaintext fields are queryable.
 */
import { encryptVault, decryptVault, type EncryptedVault } from "./vaultCrypto";
import type { Credential, CredentialCategory } from "./vaultStore";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

// ── Row type in Supabase ──────────────────────────────────
type DBRow = {
  id: string;
  title: string;
  category: string;
  site?: string;
  project?: string;
  username?: string;
  password_enc?: string;
  api_key_enc?: string;
  host?: string;
  port?: string;
  db_name?: string;
  notes_enc?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

// ── Encrypt/decrypt helpers ───────────────────────────────
async function encField(val: string | undefined, mp: string): Promise<string | undefined> {
  if (!val) return undefined;
  const enc = await encryptVault(val, mp);
  return JSON.stringify(enc);
}

async function decField(enc: string | undefined, mp: string): Promise<string | undefined> {
  if (!enc) return undefined;
  try {
    return await decryptVault(JSON.parse(enc) as EncryptedVault, mp);
  } catch {
    return undefined;
  }
}

// ── DB row → Credential (without secrets) ────────────────
function rowToSafe(row: DBRow): Omit<Credential, "password" | "apiKey"> {
  return {
    id: row.id,
    title: row.title,
    category: row.category as CredentialCategory,
    site: row.site,
    project: row.project,
    username: row.username,
    host: row.host,
    port: row.port,
    database: row.db_name,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── DB row → full Credential (with decrypted secrets) ────
async function rowToFull(row: DBRow, masterPassword: string): Promise<Credential> {
  const [password, apiKey, notes] = await Promise.all([
    decField(row.password_enc, masterPassword),
    decField(row.api_key_enc, masterPassword),
    decField(row.notes_enc, masterPassword),
  ]);
  return { ...rowToSafe(row), password, apiKey, notes };
}

// ── Credential → DB upsert body ───────────────────────────
async function credToRow(
  cred: Omit<Credential, "id" | "createdAt" | "updatedAt">,
  masterPassword: string
): Promise<Omit<DBRow, "id" | "created_at" | "updated_at">> {
  const [password_enc, api_key_enc, notes_enc] = await Promise.all([
    encField(cred.password, masterPassword),
    encField(cred.apiKey, masterPassword),
    encField(cred.notes, masterPassword),
  ]);
  return {
    title: cred.title,
    category: cred.category,
    site: cred.site,
    project: cred.project,
    username: cred.username,
    password_enc,
    api_key_enc,
    host: cred.host,
    port: cred.port,
    db_name: cred.database,
    notes_enc,
    tags: cred.tags ?? [],
  };
}

// ── CRUD ──────────────────────────────────────────────────

export async function listCredentials(filters?: {
  project?: string;
  category?: string;
  q?: string;
}): Promise<{ credentials: Omit<Credential, "password" | "apiKey">[]; projects: string[]; total: number }> {
  let url = `${SUPABASE_URL}/rest/v1/credentials?order=created_at.desc`;
  if (filters?.category) url += `&category=eq.${encodeURIComponent(filters.category)}`;
  if (filters?.project)  url += `&project=eq.${encodeURIComponent(filters.project)}`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase list failed ${res.status}`);
  let rows: DBRow[] = await res.json();

  // client-side text filter (title/site/username)
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.site?.toLowerCase().includes(q) ||
        r.project?.toLowerCase().includes(q) ||
        r.username?.toLowerCase().includes(q)
    );
  }

  const credentials = rows.map(rowToSafe);
  const projectSet = new Set(rows.map((r) => r.project).filter(Boolean) as string[]);
  return { credentials, projects: [...projectSet].sort(), total: rows.length };
}

export async function getCredential(id: string, masterPassword: string): Promise<Credential | null> {
  const url = `${SUPABASE_URL}/rest/v1/credentials?id=eq.${encodeURIComponent(id)}&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const rows: DBRow[] = await res.json();
  if (!rows.length) return null;
  return rowToFull(rows[0], masterPassword);
}

export async function createCredential(
  data: Omit<Credential, "id" | "createdAt" | "updatedAt">,
  masterPassword: string
): Promise<Omit<Credential, "password" | "apiKey">> {
  const body = await credToRow(data, masterPassword);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/credentials`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase insert failed ${res.status}: ${await res.text()}`);
  const rows: DBRow[] = await res.json();
  return rowToSafe(rows[0]);
}

export async function updateCredential(
  id: string,
  updates: Partial<Omit<Credential, "id" | "createdAt" | "updatedAt">>,
  masterPassword: string
): Promise<void> {
  const partial: Partial<Omit<DBRow, "id" | "created_at">> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined)    partial.title = updates.title;
  if (updates.category !== undefined) partial.category = updates.category;
  if (updates.site !== undefined)     partial.site = updates.site;
  if (updates.project !== undefined)  partial.project = updates.project;
  if (updates.username !== undefined) partial.username = updates.username;
  if (updates.host !== undefined)     partial.host = updates.host;
  if (updates.port !== undefined)     partial.port = updates.port;
  if (updates.database !== undefined) partial.db_name = updates.database;
  if (updates.tags !== undefined)     partial.tags = updates.tags;
  if (updates.password !== undefined) partial.password_enc = await encField(updates.password, masterPassword);
  if (updates.apiKey !== undefined)   partial.api_key_enc = await encField(updates.apiKey, masterPassword);
  if (updates.notes !== undefined)    partial.notes_enc = await encField(updates.notes, masterPassword);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/credentials?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error(`Supabase patch failed ${res.status}: ${await res.text()}`);
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/credentials?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Supabase delete failed ${res.status}`);
}

export async function getTotalCount(): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/credentials?select=id`, {
    headers: { ...headers(), Prefer: "count=exact" },
  });
  const countHeader = res.headers.get("content-range");
  if (countHeader) {
    const match = countHeader.match(/\/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  const rows: { id: string }[] = await res.json();
  return rows.length;
}
