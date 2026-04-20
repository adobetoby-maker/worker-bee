// Lightweight cross-component snapshot of the unlocked vault's pot names
// (no passwords). Used by the global search palette.

export interface PotSnapshot {
  id: string;
  emoji: string;
  service: string;
}

let snapshot: PotSnapshot[] = [];
const listeners = new Set<(s: PotSnapshot[]) => void>();

export function setVaultSnapshot(pots: PotSnapshot[]) {
  snapshot = pots;
  listeners.forEach((l) => l(snapshot));
}

export function getVaultSnapshot(): PotSnapshot[] {
  return snapshot;
}

export function subscribeVaultSnapshot(fn: (s: PotSnapshot[]) => void): () => void {
  listeners.add(fn);
  fn(snapshot);
  return () => listeners.delete(fn);
}
