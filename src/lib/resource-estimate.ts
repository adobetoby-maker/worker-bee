interface ModelLoad {
  ram: number; // GB
  vram: number; // GB
}

const DEFAULT: ModelLoad = { ram: 4, vram: 3 };

export function estimateModelLoad(modelName: string | null | undefined): ModelLoad {
  if (!modelName) return { ram: 0, vram: 0 };
  const name = modelName.toLowerCase();
  if (name.includes("llava")) return { ram: 6, vram: 5 };
  // Match :1b, :3b, :7b, :8b, :13b, :14b, :30b, :32b, :70b
  const m = name.match(/[:\-]?(\d{1,3})b\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n <= 3) return { ram: 2, vram: 1.5 };
    if (n <= 8) return { ram: 5, vram: 4 };
    if (n <= 14) return { ram: 9, vram: 7 };
    if (n <= 32) return { ram: 20, vram: 16 };
    if (n <= 70) return { ram: 40, vram: 35 };
  }
  return DEFAULT;
}

export interface ResourceEstimate {
  ramUsed: number;
  ramTotal: number;
  vramUsed: number;
  vramTotal: number;
  cpuPct: number;
}

export const TOTAL_RAM_GB = 8;
export const TOTAL_VRAM_GB = 4;

export function computeResources(
  streamingModels: (string | null)[],
  idleCpuPct = 12,
): ResourceEstimate {
  let ram = 0;
  let vram = 0;
  for (const m of streamingModels) {
    const load = estimateModelLoad(m);
    ram += load.ram;
    vram += load.vram;
  }
  // Add a small idle baseline so the bar isn't empty
  ram = Math.min(TOTAL_RAM_GB, ram + 0.6);
  vram = Math.min(TOTAL_VRAM_GB, vram);
  const cpu = Math.min(100, idleCpuPct + streamingModels.length * 28);
  return {
    ramUsed: ram,
    ramTotal: TOTAL_RAM_GB,
    vramUsed: vram,
    vramTotal: TOTAL_VRAM_GB,
    cpuPct: cpu,
  };
}
