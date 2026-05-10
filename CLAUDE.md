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

---

## climb-brasil repo — Image Fix Queue

Repo: `adobetoby-maker/climb-brasil`  
Live site: `https://climb-brasil.vercel.app`

### Full image audit (completed 2026-05-10)

| Photo ID | Assigned to | Status |
|---|---|---|
| `photo-1518554974948-eb46d88b056e` | Site hero + OG + JSON-LD | ✅ Brazilian (Pedra da Gávea) — **overused, appears in cards too** |
| `photo-1531514910867-8d1ca7505f55` | Rio Double Header / Urca & Gávea itinerary | ✅ Brazilian (Dois Irmãos) — used on 3 pages |
| `photo-1506905925346-21bda4d32df4` | Serra Cipó Progression itinerary | 🚫 **NOT Brazil** — Jake Ingle's Alps hiker photo. Must replace. |
| `photo-1464822759023-fed622ff2c3b` | Pedra Azul / Blue Dome | ⚠️ Unverified — likely generic mountain, not Espírito Santo |
| `photo-1516306580123-e6e52b1b7b5f` | Sugarloaf Morning Burn | ❓ Unverified |
| `photo-1534430480872-3498386e7856` | Inacio Sunset Scramble (Chapada) | ❓ Unverified |
| `photo-1501854140801-50d01698950b` | Farofa Waterfall Slab/Swim | ❓ Unverified |
| `photo-1569350252729-1eb39b37c12a` | Rio Climbing Grand Tour | ❓ Unverified |
| `photo-1724710089387-c9aa4cf9c28b` | Chapada Diamantina / Vale do Pati | ❓ Unverified |
| `photo-1550574364-981d838fa2f1` | Unknown route card (/routes only) | ❓ Unverified |

### Priority fixes
1. **Replace `photo-1506905925346-21bda4d32df4`** everywhere — not Brazilian at all
2. **Break the hero duplicate** — `photo-1518554974948` used as both global hero AND card images
3. **Verify and replace** each ❓ photo with confirmed images of the correct Brazilian location
4. **Each climbing area should have its own unique photo** — no duplicates across cards
