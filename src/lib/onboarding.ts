const KEY = "workerbee_onboarded";

// Detect a brand-new user: no Worker Bee localStorage keys at all.
const KNOWN_KEYS = [
  "openclaw_tabs",
  "workerbee_connections_v1",
  "workerbee_vault_v1",
  "openclaw.machineProfile",
  "openclaw.advisorShown",
  KEY,
];

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) === "true";
}

export function markOnboarded() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "true");
}

export function isBrandNewUser(): boolean {
  if (typeof window === "undefined") return false;
  if (isOnboarded()) return false;
  return !KNOWN_KEYS.some((k) => window.localStorage.getItem(k) !== null);
}
