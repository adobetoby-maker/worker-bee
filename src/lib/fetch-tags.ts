/**
 * Fetch Ollama model tags directly via HTTP /api/tags.
 * Endpoint may be ws://, wss://, http://, or https:// — we normalize to http(s).
 */
export interface OllamaTagModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export async function fetchTagsHTTP(endpoint: string, timeoutMs = 8000): Promise<OllamaTagModel[]> {
  const base = endpoint
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://")
    .replace(/\/$/, "");
  const url = `${base}/api/tags`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: "cors", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { models?: OllamaTagModel[] };
    return data.models ?? [];
  } finally {
    clearTimeout(t);
  }
}