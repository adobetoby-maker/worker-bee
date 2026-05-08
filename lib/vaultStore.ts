import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { encryptVault, decryptVault, type EncryptedVault } from "./vaultCrypto";

// ── Data model ────────────────────────────────────────────
export type CredentialCategory =
  | "login"
  | "api-key"
  | "database"
  | "ssh"
  | "env"
  | "note";

export type Credential = {
  id: string;
  title: string;
  category: CredentialCategory;
  site?: string;
  project?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  host?: string;
  port?: string;
  database?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

type VaultData = {
  version: 1;
  credentials: Credential[];
};

// ── Session token encryption (AES-256-GCM, key = ADMIN_SECRET) ──────────
// The vault_session cookie stores the master password encrypted with the
// server's ADMIN_SECRET so any Lambda instance can reconstruct the vault.

function sessionKey(): Buffer {
  const raw = process.env.ADMIN_SECRET!;
  // ADMIN_SECRET is base64-encoded 32 bytes
  return Buffer.from(raw, "base64");
}

export function createSession(masterPassword: string): string {
  const key = sessionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(masterPassword, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // pack: iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function decryptSession(token: string): string | null {
  try {
    const key = sessionKey();
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ── Warm-instance cache (optional speed boost) ────────────────────────────
// Key = session token. Entries are cleared after SESSION_TTL.
const cache = new Map<string, { data: VaultData; expires: number }>();
const SESSION_TTL = 4 * 60 * 60 * 1000;

export async function getSession(token: string): Promise<VaultData | null> {
  // Fast path: in-memory cache (works on warm Lambda instances)
  const hit = cache.get(token);
  if (hit) {
    if (Date.now() > hit.expires) { cache.delete(token); }
    else { hit.expires = Date.now() + SESSION_TTL; return hit.data; }
  }

  // Cold path: decrypt master password from token, reload vault from Supabase
  const masterPassword = decryptSession(token);
  if (!masterPassword) return null;

  try {
    const data = await unlockVault(masterPassword);
    cache.set(token, { data, expires: Date.now() + SESSION_TTL });
    return data;
  } catch {
    return null;
  }
}

export function updateSession(token: string, data: VaultData): void {
  const hit = cache.get(token);
  if (hit) hit.data = data;
}

export function deleteSession(token: string): void {
  cache.delete(token);
}

// ── Supabase persistence (encrypted blob) ─────────────────
// Stores a single row with id='default' in vault_storage table.
// The value is always AES-256-GCM encrypted — Supabase never sees plaintext.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function dbGet(): Promise<EncryptedVault | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/vault_storage?id=eq.default&select=data`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const rows = await res.json();
  if (!res.ok) throw new Error(`Supabase read failed ${res.status}: ${JSON.stringify(rows)}`);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].data as EncryptedVault;
}

async function dbUpsert(enc: EncryptedVault): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vault_storage`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: "default", data: enc, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert failed ${res.status}: ${body}`);
  }
}

export async function vaultExists(): Promise<boolean> {
  const enc = await dbGet();
  return enc !== null;
}

export async function loadVaultFile(): Promise<EncryptedVault> {
  const enc = await dbGet();
  if (!enc) throw new Error("No vault found. Create one first.");
  return enc;
}

export async function saveVaultFile(data: VaultData, masterPassword: string): Promise<void> {
  const enc = await encryptVault(JSON.stringify(data), masterPassword);
  await dbUpsert(enc);
}

export async function unlockVault(masterPassword: string): Promise<VaultData> {
  const enc = await loadVaultFile();
  const plain = await decryptVault(enc, masterPassword);
  return JSON.parse(plain) as VaultData;
}

export async function initVault(masterPassword: string): Promise<VaultData> {
  const data: VaultData = { version: 1, credentials: [] };
  await saveVaultFile(data, masterPassword);
  return data;
}

// ── CRUD helpers ──────────────────────────────────────────
export function addCredential(
  data: VaultData,
  cred: Omit<Credential, "id" | "createdAt" | "updatedAt">
): Credential {
  const now = new Date().toISOString();
  const entry: Credential = { ...cred, id: randomBytes(12).toString("hex"), createdAt: now, updatedAt: now };
  data.credentials.push(entry);
  return entry;
}

export function updateCredential(
  data: VaultData,
  id: string,
  updates: Partial<Omit<Credential, "id" | "createdAt">>
): void {
  const idx = data.credentials.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Credential not found");
  data.credentials[idx] = { ...data.credentials[idx], ...updates, updatedAt: new Date().toISOString() };
}

export function deleteCredential(data: VaultData, id: string): void {
  data.credentials = data.credentials.filter((c) => c.id !== id);
}

export function getAllProjects(data: VaultData): string[] {
  const seen: Record<string, true> = {};
  const result: string[] = [];
  for (const c of data.credentials) {
    if (c.project && !seen[c.project]) { seen[c.project] = true; result.push(c.project); }
  }
  return result.sort();
}
