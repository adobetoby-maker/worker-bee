// Global sequential agent queue.
// Only one tab streams at a time unless parallelMode is enabled.

export interface QueueEntry {
  tabId: string;
  tabName: string;
  tabColor: string;
  text: string; // pending message to send
  model: string | null;
  messagePreview: string;
  addedAt: number;
}

export interface QueueState {
  activeTabId: string | null;
  activeStartedAt: number | null;
  activePreview: string;
  activeModel: string | null;
  queue: QueueEntry[];
  parallelMode: boolean;
}

const PARALLEL_KEY = "workerbee_parallel_mode";

function loadParallel(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PARALLEL_KEY) === "1";
}

let state: QueueState = {
  activeTabId: null,
  activeStartedAt: null,
  activePreview: "",
  activeModel: null,
  queue: [],
  parallelMode: loadParallel(),
};

const listeners = new Set<(s: QueueState) => void>();

function emit() {
  const snap: QueueState = { ...state, queue: [...state.queue] };
  listeners.forEach((l) => l(snap));
}

export function subscribeQueue(fn: (s: QueueState) => void): () => void {
  fn({ ...state, queue: [...state.queue] });
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getQueueState(): QueueState {
  return { ...state, queue: [...state.queue] };
}

export function setParallelMode(on: boolean) {
  state.parallelMode = on;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PARALLEL_KEY, on ? "1" : "0");
  }
  emit();
}

/** Returns true if the tab can start streaming immediately. */
export function canStartImmediately(tabId: string): boolean {
  if (state.parallelMode) return true;
  if (state.activeTabId === null || state.activeTabId === tabId) return true;
  return false;
}

/** Mark a tab as actively streaming. */
export function markActive(
  tabId: string,
  preview: string,
  model: string | null,
) {
  if (state.parallelMode) {
    // In parallel mode we don't track a single active; still record latest for UI
    state.activeTabId = tabId;
    state.activeStartedAt = Date.now();
    state.activePreview = preview;
    state.activeModel = model;
    emit();
    return;
  }
  state.activeTabId = tabId;
  state.activeStartedAt = Date.now();
  state.activePreview = preview;
  state.activeModel = model;
  // Remove any queued entry for this tab
  state.queue = state.queue.filter((q) => q.tabId !== tabId);
  emit();
}

/** Add a tab's pending send to the queue. */
export function enqueue(entry: Omit<QueueEntry, "addedAt">): QueueEntry {
  // Replace existing entry for this tab (only one queued message per tab)
  const without = state.queue.filter((q) => q.tabId !== entry.tabId);
  const full: QueueEntry = { ...entry, addedAt: Date.now() };
  state.queue = [...without, full];
  emit();
  return full;
}

export function cancelQueued(tabId: string) {
  const before = state.queue.length;
  state.queue = state.queue.filter((q) => q.tabId !== tabId);
  if (state.queue.length !== before) emit();
}

export function moveToFront(tabId: string) {
  const idx = state.queue.findIndex((q) => q.tabId === tabId);
  if (idx <= 0) return;
  const item = state.queue[idx];
  state.queue = [item, ...state.queue.filter((_, i) => i !== idx)];
  emit();
}

export function moveUp(tabId: string) {
  const idx = state.queue.findIndex((q) => q.tabId === tabId);
  if (idx <= 0) return;
  const next = [...state.queue];
  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
  state.queue = next;
  emit();
}

/** Called when the active tab finishes streaming. Returns the next entry to start, if any. */
export function finishActive(tabId: string): QueueEntry | null {
  if (state.activeTabId === tabId) {
    state.activeTabId = null;
    state.activeStartedAt = null;
    state.activePreview = "";
    state.activeModel = null;
  }
  if (state.parallelMode) {
    emit();
    return null;
  }
  const next = state.queue[0] ?? null;
  if (next) {
    state.queue = state.queue.slice(1);
  }
  emit();
  return next;
}

export function queuePositionFor(tabId: string): number {
  const idx = state.queue.findIndex((q) => q.tabId === tabId);
  return idx < 0 ? 0 : idx + 1;
}

export function isQueued(tabId: string): boolean {
  return state.queue.some((q) => q.tabId === tabId);
}

const AVG_STREAM_SECONDS = 40;
export function estimatedWaitSeconds(tabId: string): number {
  const pos = queuePositionFor(tabId);
  if (pos === 0) return 0;
  // pos counts include this tab; agents ahead = pos - 1, plus one currently running
  const ahead = pos - 1 + (state.activeTabId ? 1 : 0);
  return ahead * AVG_STREAM_SECONDS;
}
