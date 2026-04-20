// AES-GCM 256 + PBKDF2 vault crypto + storage
// All payloads are encrypted client-side. Master password is never stored.

export type Category = "EMAIL" | "SOCIAL" | "HOSTING" | "API" | "DATABASE" | "OTHER";

export interface HoneyPot {
  id: string;
  emoji: string;
  service: string;
  category: Category;
  username: string;
  password: string;
  notes?: string;
  tags: string[];
  createdAt: number;
}

export interface VaultBlob {
  v: 1;
  salt: string; // base64
  iv: string;   // base64
  ciphertext: string; // base64
  // Verification ciphertext: encrypts a known constant so we can detect wrong passwords on unlock.
  verifyIv: string;
  verifyCt: string;
}

const STORAGE_KEY = "workerbee_vault_v1";
const ATTEMPTS_KEY = "workerbee_vault_attempts";
const LOCKOUT_KEY = "workerbee_vault_lockout_until";
const VERIFY_PLAINTEXT = "workerbee:vault:ok";

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 250_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function vaultExists(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(STORAGE_KEY);
}

export function getLockoutRemaining(): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(LOCKOUT_KEY);
  if (!v) return 0;
  const until = parseInt(v, 10);
  const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  if (remaining === 0) window.localStorage.removeItem(LOCKOUT_KEY);
  return remaining;
}

export function getAttempts(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(ATTEMPTS_KEY) ?? "0", 10) || 0;
}

function setAttempts(n: number) {
  window.localStorage.setItem(ATTEMPTS_KEY, String(n));
}

function triggerLockout(seconds: number) {
  window.localStorage.setItem(LOCKOUT_KEY, String(Date.now() + seconds * 1000));
  setAttempts(0);
}

export interface VaultSession {
  key: CryptoKey;
  pots: HoneyPot[];
}

export async function initVault(masterPassword: string): Promise<VaultSession> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(masterPassword, salt);
  const session: VaultSession = { key, pots: [] };
  await persist(session, salt);
  setAttempts(0);
  return session;
}

export async function unlockVault(masterPassword: string): Promise<VaultSession> {
  const remaining = getLockoutRemaining();
  if (remaining > 0) throw new Error(`LOCKED:${remaining}`);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("NO_VAULT");
  const blob = JSON.parse(raw) as VaultBlob;
  const salt = fromB64(blob.salt);
  const key = await deriveKey(masterPassword, salt);

  // Verify password using verify ciphertext
  try {
    const verifyPlain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.verifyIv) as unknown as BufferSource },
      key,
      fromB64(blob.verifyCt) as unknown as BufferSource,
    );
    if (dec.decode(verifyPlain) !== VERIFY_PLAINTEXT) throw new Error("BAD");
  } catch {
    const attempts = getAttempts() + 1;
    if (attempts >= 3) {
      triggerLockout(60);
      throw new Error("LOCKED:60");
    }
    setAttempts(attempts);
    throw new Error(`WRONG:${3 - attempts}`);
  }

  // Decrypt main payload
  let pots: HoneyPot[] = [];
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.iv) as unknown as BufferSource },
      key,
      fromB64(blob.ciphertext) as unknown as BufferSource,
    );
    pots = JSON.parse(dec.decode(plainBuf)) as HoneyPot[];
  } catch {
    pots = [];
  }
  setAttempts(0);
  return { key, pots };
}

async function persist(session: VaultSession, saltOverride?: Uint8Array): Promise<void> {
  const existingRaw = window.localStorage.getItem(STORAGE_KEY);
  const salt = saltOverride
    ? saltOverride
    : existingRaw
      ? fromB64((JSON.parse(existingRaw) as VaultBlob).salt)
      : crypto.getRandomValues(new Uint8Array(16));

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    session.key,
    enc.encode(JSON.stringify(session.pots)),
  );

  const verifyIv = crypto.getRandomValues(new Uint8Array(12));
  const verifyCt = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: verifyIv as unknown as BufferSource },
    session.key,
    enc.encode(VERIFY_PLAINTEXT),
  );

  const blob: VaultBlob = {
    v: 1,
    salt: toB64(salt),
    iv: toB64(iv),
    ciphertext: toB64(ct),
    verifyIv: toB64(verifyIv),
    verifyCt: toB64(verifyCt),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export async function savePots(session: VaultSession): Promise<void> {
  await persist(session);
}

export function exportBackup(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function importBackup(jsonText: string): void {
  const parsed = JSON.parse(jsonText) as VaultBlob;
  if (parsed.v !== 1 || !parsed.salt || !parsed.ciphertext) {
    throw new Error("Invalid backup file");
  }
  window.localStorage.setItem(STORAGE_KEY, jsonText);
  // Reset attempts so user can unlock fresh
  window.localStorage.removeItem(ATTEMPTS_KEY);
  window.localStorage.removeItem(LOCKOUT_KEY);
}

// Password strength: returns 0..4 (weak..fortress)
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 20) score = Math.min(4, score + 1);
  return Math.min(4, score);
}

export function generatePassword(length = 20): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-=[]{}";
  const out: string[] = [];
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  for (let i = 0; i < length; i++) out.push(chars[buf[i] % chars.length]);
  return out.join("");
}
