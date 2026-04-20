export interface MachineProfile {
  id: string;
  icon: string;
  name: string;
  ramGb: number;
  vramGb: number; // 0 means no discrete GPU; for Apple Silicon we use unified
  unified: boolean;
  blurb: string;
}

export const MACHINE_PROFILES: MachineProfile[] = [
  {
    id: "mba-m1",
    icon: "🍎",
    name: "MacBook Air M1/M2",
    ramGb: 8,
    vramGb: 0,
    unified: true,
    blurb: "8 GB unified · No discrete GPU",
  },
  {
    id: "mbp-m2",
    icon: "🍎",
    name: "MacBook Pro M2/M3",
    ramGb: 16,
    vramGb: 0,
    unified: true,
    blurb: "16 GB unified · No discrete GPU",
  },
  {
    id: "mac-studio",
    icon: "🍎",
    name: "Mac Studio / Pro M2",
    ramGb: 64,
    vramGb: 0,
    unified: true,
    blurb: "32–96 GB unified · No discrete GPU",
  },
  {
    id: "ubuntu-3060",
    icon: "🖥",
    name: "Ubuntu + RTX 3060",
    ramGb: 32,
    vramGb: 12,
    unified: false,
    blurb: "12 GB VRAM · 16–32 GB RAM",
  },
  {
    id: "ubuntu-4090",
    icon: "🖥",
    name: "Ubuntu + RTX 3090/4090",
    ramGb: 64,
    vramGb: 24,
    unified: false,
    blurb: "24 GB VRAM · 32–64 GB RAM",
  },
  {
    id: "ubuntu-cpu",
    icon: "🖥",
    name: "Ubuntu CPU-only",
    ramGb: 32,
    vramGb: 0,
    unified: false,
    blurb: "No GPU · 16–64 GB RAM",
  },
];

export interface ProfileLimits {
  effectiveRamGb: number; // RAM available to models
  effectiveVramGb: number; // VRAM (or unified for Apple)
  maxAgents: number;
  maxModelLabel: string;
}

export function computeLimits(p: MachineProfile): ProfileLimits {
  // For Apple Silicon, unified memory acts as both RAM and VRAM
  const vram = p.unified ? p.ramGb : p.vramGb;
  // Reserve ~3 GB for OS / other apps
  const usable = Math.max(2, p.ramGb - 3);
  // Assume avg 5 GB per concurrent agent (7B model footprint)
  const maxAgents = Math.max(1, Math.floor(usable / 5));
  let maxModelLabel = "Up to 3B models";
  const cap = vram || usable;
  if (cap >= 35) maxModelLabel = "Up to 70B models";
  else if (cap >= 16) maxModelLabel = "Up to 32B models";
  else if (cap >= 7) maxModelLabel = "Up to 13B models";
  else if (cap >= 4) maxModelLabel = "Up to 7B/8B models";
  else if (cap >= 1.5) maxModelLabel = "Up to 3B models";
  else maxModelLabel = "Tiny models only";
  return {
    effectiveRamGb: p.ramGb,
    effectiveVramGb: vram,
    maxAgents,
    maxModelLabel,
  };
}

const STORAGE_KEY = "openclaw.machineProfile";

export function loadStoredProfile(): MachineProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MachineProfile;
  } catch {
    return null;
  }
}

export function saveStoredProfile(p: MachineProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

const ADVISOR_SHOWN_KEY = "openclaw.advisorShown";
export function isAdvisorShown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ADVISOR_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}
export function markAdvisorShown() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADVISOR_SHOWN_KEY, "1");
  } catch {
    // ignore
  }
}
