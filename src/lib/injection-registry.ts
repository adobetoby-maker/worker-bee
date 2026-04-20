// Tracks which honey pot is injected into which tab.
// Enforces single-tab injection per pot.

interface State {
  // potName -> tabId
  byPot: Record<string, string>;
  // tabId -> potNames[]
  byTab: Record<string, string[]>;
}

let state: State = { byPot: {}, byTab: {} };
const listeners = new Set<(s: State) => void>();

function emit() {
  listeners.forEach((l) => l({ byPot: { ...state.byPot }, byTab: { ...state.byTab } }));
}

export function subscribeInjection(fn: (s: State) => void): () => void {
  fn({ byPot: { ...state.byPot }, byTab: { ...state.byTab } });
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getInjectionForPot(potName: string): string | null {
  return state.byPot[potName] ?? null;
}

export function getCredentialsForTab(tabId: string): string[] {
  return state.byTab[tabId] ? [...state.byTab[tabId]] : [];
}

// Inject pot into tab. If pot is already injected elsewhere, the caller
// must have already confirmed via the move-confirmation modal.
export function injectPot(potName: string, tabId: string) {
  // Remove from any prior tab.
  const prior = state.byPot[potName];
  if (prior && prior !== tabId) {
    state.byTab[prior] = (state.byTab[prior] ?? []).filter((p) => p !== potName);
    if (state.byTab[prior].length === 0) delete state.byTab[prior];
  }
  state.byPot[potName] = tabId;
  const cur = state.byTab[tabId] ?? [];
  if (!cur.includes(potName)) state.byTab[tabId] = [...cur, potName];
  emit();
}

export function ejectPotFromTab(potName: string, tabId: string) {
  if (state.byPot[potName] === tabId) delete state.byPot[potName];
  if (state.byTab[tabId]) {
    state.byTab[tabId] = state.byTab[tabId].filter((p) => p !== potName);
    if (state.byTab[tabId].length === 0) delete state.byTab[tabId];
  }
  emit();
}

// Eject every pot bound to this tab. Returns the list of ejected pot names.
export function ejectAllForTab(tabId: string): string[] {
  const ejected = state.byTab[tabId] ? [...state.byTab[tabId]] : [];
  for (const p of ejected) {
    if (state.byPot[p] === tabId) delete state.byPot[p];
  }
  delete state.byTab[tabId];
  if (ejected.length) emit();
  return ejected;
}
