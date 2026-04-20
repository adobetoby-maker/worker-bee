// Vault auto-lock idle timer. Resets on any vault interaction.
// Persists the chosen timeout in localStorage; the timer itself is in-memory.

export type LockTimeout = 5 | 15 | 30 | 60 | 0; // 0 = never
const TIMEOUT_KEY = "workerbee_vault_lock_timeout";
const DEFAULT_MIN: LockTimeout = 30;

export function loadLockTimeoutMinutes(): LockTimeout {
  if (typeof window === "undefined") return DEFAULT_MIN;
  const raw = window.localStorage.getItem(TIMEOUT_KEY);
  if (!raw) return DEFAULT_MIN;
  const n = parseInt(raw, 10);
  if ([0, 5, 15, 30, 60].includes(n)) return n as LockTimeout;
  return DEFAULT_MIN;
}

export function saveLockTimeoutMinutes(n: LockTimeout) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIMEOUT_KEY, String(n));
}

let timer: ReturnType<typeof setTimeout> | null = null;
let onLockCb: (() => void) | null = null;

export function startAutoLock(onLock: () => void) {
  onLockCb = onLock;
  resetAutoLock();
}

export function resetAutoLock() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const minutes = loadLockTimeoutMinutes();
  if (minutes === 0) return; // never
  if (!onLockCb) return;
  timer = setTimeout(() => {
    onLockCb?.();
  }, minutes * 60 * 1000);
}

export function stopAutoLock() {
  if (timer) clearTimeout(timer);
  timer = null;
  onLockCb = null;
}
