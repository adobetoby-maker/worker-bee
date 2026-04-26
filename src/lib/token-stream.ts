// Lightweight global pub/sub for the live token stream panel.
// Tokens from any in-flight chat stream are pushed here and the
// TokenStreamPanel component renders them in real time.

type Listener = () => void;

const MAX_CHARS = 12000;

let buffer = "";
let active = false;
let activeTabId: string | null = null;
let lastUpdate = 0;
const listeners = new Set<Listener>();

function notify() {
  lastUpdate = Date.now();
  listeners.forEach((l) => l());
}

export function tokenStreamSubscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function tokenStreamGet() {
  return { buffer, active, activeTabId, lastUpdate };
}

export function tokenStreamBegin(tabId: string) {
  buffer = "";
  active = true;
  activeTabId = tabId;
  notify();
}

export function tokenStreamPush(tabId: string, tok: string) {
  if (!tok) return;
  if (!active) {
    buffer = "";
    active = true;
    activeTabId = tabId;
  }
  buffer += tok;
  if (buffer.length > MAX_CHARS) {
    buffer = buffer.slice(buffer.length - MAX_CHARS);
  }
  notify();
}

export function tokenStreamEnd() {
  active = false;
  notify();
}

export function tokenStreamClear() {
  buffer = "";
  active = false;
  activeTabId = null;
  notify();
}
