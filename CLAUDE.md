# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (Cloudflare Workers target)
npm run build:dev  # Development build
npm run preview    # Preview production build locally
npm run lint       # ESLint
npm run format     # Prettier (writes in place)
```

There is no test suite. TypeScript checking is done implicitly by Vite during build; use `npm run build:dev` to surface type errors without a full production bundle.

## Architecture

### What This App Is

Worker Bee is a local AI agent dashboard — a browser UI that connects to a self-hosted backend (expected at `http://localhost:8000` or `https://localhost:8000`) and a local Ollama instance. The backend is a separate project; this repo is the frontend only.

### Stack

- **TanStack Start** (file-based SSR router, TanStack Query) with **React 19**
- **Cloudflare Workers** as the deploy target (`wrangler.jsonc`, `@cloudflare/vite-plugin`)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Supabase** for optional cloud data (`src/integrations/supabase/`)
- **shadcn/ui** component primitives in `src/components/ui/`
- **PWA** via `vite-plugin-pwa` (service worker disabled in editor/iframe previews)

The Vite config is provided by `@lovable.dev/vite-tanstack-config` — do NOT manually add the plugins it already includes (tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare, etc).

### Routes

Routes live in `src/routes/` and follow TanStack file-based conventions (`__root.tsx`, `index.tsx`, etc.). The root of the application is effectively `src/routes/index.tsx`, which is a large single-page orchestrator. Additional routes:

- `/jay` — "Jay Cockpit" skills/learning dashboard
- `/report` — morning report view (auto-redirected to between 5–9am)
- `/learning`, `/practice`, `/skills` — agent skill management
- `/api/send-email` — server-side API route
- `/lovable/email/queue/process` — Lovable webhook endpoint

### Multi-Tab Agent System (the core data model)

The entire application revolves around **tabs**, where each tab is an independent chat agent. The orchestration lives in `src/routes/index.tsx`:

- Each tab has its own `id`, model selection, message history, system prompt, streaming state, and error state.
- Tabs are persisted to `localStorage` under `openclaw_tabs`.
- Each tab gets its own WebSocket connection managed in `src/lib/agent-ws.ts`.

### WebSocket Layer (`src/lib/agent-ws.ts`)

This is the communication core. It maintains two kinds of WebSocket connections:

1. **Per-tab sockets** (`ws://<endpoint>/ws/<tabId>`) — carry streaming chat tokens and all agent tool results. Each socket auto-reconnects with exponential backoff (up to 10 attempts, 1s–30s) and has a 30s heartbeat + 20s keepalive ping.

2. **Control socket** (`ws://<endpoint>/ws/control-<random>`) — a shared socket per endpoint used for out-of-band requests (`get_tags`, `get_ps`) to avoid browser mixed-content blocks when the page is on HTTPS and Ollama is on HTTP.

Inbound WebSocket message types are enumerated in `AgentWSMessage` and dispatched to registered `AgentWSHandlers`. Outbound messages are sent via `sendChat`, `sendBuild`, `sendShell`, `sendGmail`, `sendPlan`, etc.

### Agent Queue (`src/lib/agent-queue.ts`)

A module-level singleton (not React state) that enforces sequential-by-default streaming. When more than one tab exists, new sends are queued unless the queue is empty or parallel mode is enabled. The `Index` component subscribes via `subscribeQueue` and wires promotion signals (`autoSendByTab`) back into the relevant `ChatView`.

### Hive Vault (`src/lib/vault.ts`)

Client-side credential store encrypted with AES-GCM 256 + PBKDF2 (250k iterations). The master password is never stored. Credentials ("honey pots") are injected into individual tabs by label only — the actual username/password values are never sent to the LLM. Injection state is tracked in `src/lib/injection-registry.ts` and included in the enriched system prompt by reference.

### System Prompt Enrichment (`src/lib/system-prompt.ts`)

Before each chat, `buildEnrichedSystemPrompt` assembles context: active tools, connected services (Gmail/Slack/WhatsApp), injected credential labels, and the machine profile resource limits. Per-tab custom prompts are appended after this enriched base.

### Project / File Store (`src/lib/projects.ts`)

Hive Projects group files, screenshots, and audit reports for a website build. Stored in `localStorage` under `workerbee_projects`. Files are plain text (HTML/CSS/JS/etc.) saved in-browser. The diff viewer (`src/components/DiffViewer.tsx`) lets users accept/reject agent-proposed file changes before they're committed to the project store.

### Auto-connect (`src/lib/auto-connect.ts`)

On startup, probes endpoints in order: saved endpoint → `https://localhost:8000` → `http://localhost:8000` → `http://localhost:11434`. All probes go through WebSocket (not HTTP fetch) to avoid mixed-content blocks. The backend install script is referenced as:
```
curl -fsSL https://raw.githubusercontent.com/adobetoby-maker/workerbee-ai/refs/heads/main/mac-install.sh | zsh
```

### Activity Feed & Pub/Sub Pattern

Several modules (`src/lib/activity-feed.ts`, `src/lib/agent-queue.ts`, `src/lib/projects.ts`, `src/lib/injection-registry.ts`, `src/lib/vault-snapshot.ts`) use the same pub/sub pattern: a module-level `listeners` Set, an `emit()` function, and a `subscribe*` export that returns an unsubscribe function. React components call these in `useEffect` cleanup.

### Supabase Integration

`src/integrations/supabase/client.ts` is auto-generated. Supabase is used for optional cloud features (email infrastructure, learning/practice data). The client is lazy-initialized via Proxy to avoid crashing when env vars are absent during SSR. Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Sidebar Views

The `Sidebar` component drives which panel is shown via a `View` string union. The main views are: `chat`, `builder`, `tools`, `blueprint`, `vault`, `connections`, `inbox-cleaner`, `config`, `email`.

### Mobile

`MobileTabBar` (fixed bottom bar) and `MobileNavDrawer` replace the desktop Sidebar on narrow screens. A spacer div at the bottom of the layout prevents content from being clipped behind the fixed bar.
