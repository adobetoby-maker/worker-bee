// User identity selector — "toby" (default) or "jay".
// Persisted in localStorage and broadcast via a CustomEvent so any module
// can read the current value without prop drilling.

export type Identity = "toby" | "jay";

const KEY = "workerbee_identity";
const EVT = "workerbee:identity-change";

export function getIdentity(): Identity {
  if (typeof window === "undefined") return "toby";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "jay" ? "jay" : "toby";
  } catch {
    return "toby";
  }
}

export function setIdentity(next: Identity): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<Identity>(EVT, { detail: next }));
}

export function subscribeIdentity(cb: (id: Identity) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<Identity>).detail);
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}