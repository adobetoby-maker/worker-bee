// Projects store — every "Hive Project" groups conversations, files,
// screenshots, and audit reports for a single website build.
// Persisted to localStorage under "workerbee_projects".

export type ProjectStatus = "planning" | "in_progress" | "review" | "shipped";

export interface ProjectFile {
  id: string;
  path: string; // e.g. "index.html" or "assets/hero.png"
  language: string; // "html" | "css" | "js" | "json" | "md" | "image" | "text"
  content: string; // text content; for image, a data URL or empty
  size: number; // bytes
  updatedAt: number;
}

export interface ProjectScreenshot {
  id: string;
  label: string; // e.g. "Homepage hero"
  takenAt: number;
  // We don't store actual images locally — placeholder records only.
}

export type AuditCategory = "performance" | "seo" | "accessibility" | "best_practices";
export interface AuditReport {
  id: string;
  category: AuditCategory;
  score: number; // 0-100
  takenAt: number;
  summary?: string;
}

export interface Project {
  id: string;
  emoji: string;
  name: string;
  client?: string;
  targetUrl?: string;
  status: ProjectStatus;
  description?: string;
  assignedTabId?: string | null;
  files: ProjectFile[];
  screenshots: ProjectScreenshot[];
  audits: AuditReport[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

const STORAGE_KEY = "workerbee_projects";

let projects: Project[] = load();
const listeners = new Set<(p: Project[]) => void>();

function load(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore quota
  }
}

function emit() {
  listeners.forEach((l) => l([...projects]));
}

export function subscribeProjects(fn: (p: Project[]) => void): () => void {
  fn([...projects]);
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listProjects(): Project[] {
  return [...projects];
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function createProject(input: Omit<Project, "id" | "files" | "screenshots" | "audits" | "createdAt" | "updatedAt">): Project {
  const now = Date.now();
  const proj: Project = {
    ...input,
    id: crypto.randomUUID(),
    files: [],
    screenshots: [],
    audits: [],
    createdAt: now,
    updatedAt: now,
  };
  projects = [proj, ...projects];
  save();
  emit();
  return proj;
}

export function updateProject(id: string, patch: Partial<Project>) {
  projects = projects.map((p) =>
    p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
  );
  save();
  emit();
}

export function deleteProject(id: string) {
  projects = projects.filter((p) => p.id !== id);
  save();
  emit();
}

export function bindTabToProject(tabId: string, projectId: string | null) {
  // Clear any other project that may have claimed this tab,
  // so a tab is bound to at most one project at a time.
  projects = projects.map((p) => {
    if (p.assignedTabId === tabId && p.id !== projectId) {
      return { ...p, assignedTabId: null, updatedAt: Date.now() };
    }
    return p;
  });
  if (projectId) {
    projects = projects.map((p) =>
      p.id === projectId ? { ...p, assignedTabId: tabId, updatedAt: Date.now() } : p,
    );
  }
  save();
  emit();
}

export function projectForTab(tabId: string): Project | undefined {
  return projects.find((p) => p.assignedTabId === tabId);
}

// ----- Files -----

export function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["html", "htm"].includes(ext)) return "html";
  if (["css", "scss"].includes(ext)) return "css";
  if (["js", "jsx", "ts", "tsx", "mjs"].includes(ext)) return "js";
  if (ext === "json") return "json";
  if (ext === "md") return "md";
  if (["png", "jpg", "jpeg", "svg", "gif", "webp"].includes(ext)) return "image";
  return "text";
}

export function fileIcon(language: string): { icon: string; color: string } {
  switch (language) {
    case "html":
      return { icon: "📄", color: "#ffaa00" };
    case "css":
      return { icon: "🎨", color: "#00bfff" };
    case "js":
      return { icon: "⚡", color: "#ffcc00" };
    case "json":
      return { icon: "🔧", color: "#39ff14" };
    case "md":
      return { icon: "📝", color: "#eeeeee" };
    case "image":
      return { icon: "🖼", color: "#ff3bff" };
    default:
      return { icon: "📄", color: "#aaaaaa" };
  }
}

export function addFile(projectId: string, path: string, content: string): ProjectFile | null {
  const proj = getProject(projectId);
  if (!proj) return null;
  // If a file with this path already exists, overwrite it.
  const language = detectLanguage(path);
  const size = new Blob([content]).size;
  const existingIdx = proj.files.findIndex((f) => f.path === path);
  let file: ProjectFile;
  if (existingIdx >= 0) {
    file = { ...proj.files[existingIdx], content, language, size, updatedAt: Date.now() };
    const nextFiles = proj.files.slice();
    nextFiles[existingIdx] = file;
    updateProject(projectId, { files: nextFiles });
  } else {
    file = {
      id: crypto.randomUUID(),
      path,
      language,
      content,
      size,
      updatedAt: Date.now(),
    };
    updateProject(projectId, { files: [...proj.files, file] });
  }
  return file;
}

export function renameFile(projectId: string, fileId: string, newPath: string) {
  const proj = getProject(projectId);
  if (!proj) return;
  const next = proj.files.map((f) =>
    f.id === fileId ? { ...f, path: newPath, language: detectLanguage(newPath), updatedAt: Date.now() } : f,
  );
  updateProject(projectId, { files: next });
}

export function deleteFile(projectId: string, fileId: string) {
  const proj = getProject(projectId);
  if (!proj) return;
  updateProject(projectId, { files: proj.files.filter((f) => f.id !== fileId) });
}

// ----- Screenshots -----

export function addScreenshot(projectId: string, label: string) {
  const proj = getProject(projectId);
  if (!proj) return;
  const shot: ProjectScreenshot = {
    id: crypto.randomUUID(),
    label,
    takenAt: Date.now(),
  };
  updateProject(projectId, { screenshots: [shot, ...proj.screenshots] });
}

// ----- Audits -----

export function addAudit(projectId: string, category: AuditCategory, score: number, summary?: string) {
  const proj = getProject(projectId);
  if (!proj) return;
  const audit: AuditReport = {
    id: crypto.randomUUID(),
    category,
    score,
    summary,
    takenAt: Date.now(),
  };
  updateProject(projectId, { audits: [audit, ...proj.audits] });
}

// ----- Utilities -----

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

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: "PLANNING", color: "#444" },
  in_progress: { label: "IN PROGRESS", color: "#ffaa00" },
  review: { label: "REVIEW", color: "#00bfff" },
  shipped: { label: "SHIPPED", color: "#39ff14" },
};

export function guessFilenameFromCode(language: string, hint?: string): string {
  if (hint) return hint;
  switch (language) {
    case "html":
      return "index.html";
    case "css":
      return "styles.css";
    case "js":
      return "script.js";
    case "json":
      return "data.json";
    case "md":
      return "README.md";
    default:
      return "snippet.txt";
  }
}

export function languageFromFenceLabel(label: string | undefined): string {
  if (!label) return "text";
  const l = label.toLowerCase().trim();
  if (["html"].includes(l)) return "html";
  if (["css", "scss", "sass"].includes(l)) return "css";
  if (["js", "javascript", "ts", "typescript", "jsx", "tsx"].includes(l)) return "js";
  if (l === "json") return "json";
  if (l === "md" || l === "markdown") return "md";
  return "text";
}
