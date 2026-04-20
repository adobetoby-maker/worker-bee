// Global activity event bus for the Hive Activity feed.
// Lightweight pub/sub — any system can emit and subscribe.

export type ActivityKind = "agent" | "tool" | "connection" | "vault" | "browser";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  icon: string;
  text: string; // e.g. "Agent 1 · sent message"
  ts: number; // epoch ms
}

const MAX = 50;
let events: ActivityEvent[] = [];
const listeners = new Set<(e: ActivityEvent[]) => void>();

export function emitActivity(e: Omit<ActivityEvent, "id" | "ts">) {
  const evt: ActivityEvent = {
    ...e,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    ts: Date.now(),
  };
  events = [evt, ...events].slice(0, MAX);
  listeners.forEach((l) => l(events));
}

export function clearActivity() {
  events = [];
  listeners.forEach((l) => l(events));
}

export function getActivity(): ActivityEvent[] {
  return events;
}

export function subscribeActivity(fn: (e: ActivityEvent[]) => void): () => void {
  listeners.add(fn);
  fn(events);
  return () => listeners.delete(fn);
}

export function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
