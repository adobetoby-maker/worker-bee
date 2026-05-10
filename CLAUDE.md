# Worker Bee — Project Memory

## What this repo is

**Worker Bee** is a React/TypeScript/Vite web app that acts as an AI agent builder/cockpit. It lets users spin up AI agent tabs, each with its own WebSocket connection to a backend, and run tasks like browsing, building websites, managing email, and more.

## Tech stack

- **Framework**: React 19 + TanStack Router + TanStack Start
- **Build**: Vite 7 + `@cloudflare/vite-plugin` (deploys to Cloudflare Workers via `wrangler.jsonc`)
- **Styling**: Tailwind CSS v4 (CSS-variable-based, no config file)
- **UI primitives**: Radix UI + shadcn/ui pattern (`components.json`)
- **Backend/DB**: Supabase (`src/integrations/supabase/`)
- **Linting**: ESLint 9 flat config (`eslint.config.js`) + Prettier
- **Package manager**: npm (`package-lock.json` is canonical; `bun.lockb` also present)

## Key source layout

```
src/
  components/     # UI components (ChatView, BuilderView, PlanCard, …)
  lib/            # Pure logic (agent-ws.ts, vault.ts, system-prompt.ts, …)
  routes/         # TanStack file-based routes (index, practice, learning, …)
  hooks/          # React hooks
  integrations/   # Supabase client
```

## Scripts

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run lint      # ESLint
npm run format    # Prettier
```

## Architecture notes

- **WebSocket per tab**: `src/lib/agent-ws.ts` manages one WS per agent tab; rich message types drive all UI state.
- **Vault**: credential store, client-side encrypted; never sends plaintext to the agent.
- **System prompt**: built dynamically in `src/lib/system-prompt.ts` from connections + tools + machine profile.
- **Boot sequence**: animated log stream on agent init (`src/lib/boot-sequence.ts`).
- **Plan card**: multi-step task planner driven by `plan_*` WS events (`src/components/PlanCard.tsx`).
- **Styling rule**: all colours via CSS variables only; font JetBrains Mono for mono surfaces.

## Current objective — Brasil Climbing Site

We are using Worker Bee to build a **Brazilian rock-climbing community website**. The site should:

- Showcase climbing areas across Brazil (regions, grades, rock types)
- Allow community route logging / topos
- Be fully in Portuguese (pt-BR)
- Mobile-first design reflecting the outdoor/adventure aesthetic

Track all site-building tasks through the Worker Bee chat interface using the Plan feature (`plan_*` events). Use the BuilderView for live diffs and the BlueprintView for structural planning.

## Branch

Active dev branch: `claude/bootstrap-memory-brasil-site-rRe1C`
