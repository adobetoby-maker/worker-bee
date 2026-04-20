// Client-side credential proxy + access log.
// CRITICAL: this module never serializes credential values into prompts,
// messages, or anywhere they could leak to an LLM context. Values are
// returned only to in-app callers that explicitly need them (e.g. a tool
// runner using saved credentials to authenticate with a real service).

import type { HoneyPot } from "./vault";

export interface AccessEvent {
  id: string;
  potName: string;
  field: "username" | "password";
  agentName: string;
  ts: number;
}

const LOG_KEY = "workerbee_vault_access_log";
const MAX_LOG = 20;

let unlockedPots: HoneyPot[] = [];
let log: AccessEvent[] = loadLog();
const logListeners = new Set<(l: AccessEvent[]) => void>();

function loadLog(): AccessEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AccessEvent[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LOG) : [];
  } catch {
    return [];
  }
}

function saveLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // ignore
  }
}

function emitLog() {
  logListeners.forEach((l) => l([...log]));
}

// Called by VaultPanel whenever the vault unlocks/edits/locks so the proxy
// has the latest decrypted pots in memory. NEVER persisted.
export function setUnlockedPots(pots: HoneyPot[]) {
  unlockedPots = pots;
}

export function clearUnlockedPots() {
  unlockedPots = [];
}

// Returns the requested field value WITHOUT logging the value itself.
// Returns null if vault is locked or the pot is not found.
export function getCredential(
  name: string,
  field: "username" | "password",
  agentName: string,
): string | null {
  const pot = unlockedPots.find((p) => p.service === name);
  if (!pot) return null;
  const value = pot[field];
  // Log the access event — but never the value.
  const ev: AccessEvent = {
    id: crypto.randomUUID(),
    potName: pot.service,
    field,
    agentName,
    ts: Date.now(),
  };
  log = [ev, ...log].slice(0, MAX_LOG);
  saveLog();
  emitLog();
  return value ?? null;
}

export function listAccessLog(): AccessEvent[] {
  return [...log];
}

export function subscribeAccessLog(fn: (l: AccessEvent[]) => void): () => void {
  fn([...log]);
  logListeners.add(fn);
  return () => logListeners.delete(fn);
}

export function clearAccessLog() {
  log = [];
  saveLog();
  emitLog();
}
