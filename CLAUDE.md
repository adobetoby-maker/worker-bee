---
project: manage-worker-bee
category: nextjs-supabase-saas
deploy: vercel
lifecycle: active
last_verified: 2026-05-21
deployment_url: https://manage.worker-bee.app
---

# Manage Worker Bee

Internal operations dashboard for Drive's agency. Manages all client sites, blueprints, credentials, and AI-assisted build pipeline. No external users — open internal tool.

See `~/.claude/categories/nextjs-supabase-saas.md` for shared stack patterns.
**This file documents deviations from that category only.**

---

## Deviations from Category

- **Single Supabase client** (`lib/supabase.ts`) — service role only. No `client.ts`, no `server.ts`, no SSR cookie variants.
- **No dual auth** — `proxy.ts` is a passthrough. No `/admin` or `/portal` routes. Open internal tool.
- **No public marketing pages** — all routes are internal dashboard routes behind `/(dashboard)/`.
- **No blog, no articles.ts** — this is a tool, not a content site.
- **ComfyUI image generation** — proxied through `/api/image-gen`. Requires local ComfyUI at `127.0.0.1:8000`.

---

## Before Touching

Read `lib/blueprintStore.ts` (data model + legacy migration pattern) and `lib/vaultStore.ts` (AES-256-GCM pattern) before editing either store.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | localhost:3000 (add `-H 0.0.0.0` for Tailscale) |
| `npm run build` | production build |
| `npm run start` | serve production build locally |

No lint or test scripts exist in this project.

---

## Architecture

### Supabase Client
`lib/supabase.ts` — single service-role client. Proxy pattern defers init to avoid build-time crash on missing env vars.
```typescript
import { supabaseAdmin } from '@/lib/supabase'
// Use everywhere — server-side only. Never in Client Components.
```

### Key Stores

**`lib/blueprintStore.ts`** — reads/writes `{siteId}.json` to Supabase Storage (`blueprints` bucket).
Data model: `{ currentBranch, branches: Record<name, {nodes, edges, updatedAt}>, summary }`
Handles legacy migration from flat `{nodes, edges}` format automatically.

**`lib/vaultStore.ts`** — AES-256-GCM encrypted credential store.
Categories: `login | api-key | database | ssh | env | note`
Master password stored encrypted in `vault_session` cookie (signed with `ADMIN_SECRET`) — any server instance can reconstruct vault without re-login. Do not touch encryption logic without being asked.

### Routes

| Route | Purpose |
|---|---|
| `/(dashboard)/sites/` | Client site list + blueprint canvas (@xyflow/react) |
| `/(dashboard)/configurator/` | Generates CLAUDE.md + settings.json for new client projects |
| `/(dashboard)/vault/` | Encrypted credential manager |
| `/(dashboard)/submissions/` | Incoming client blueprint submissions |
| `/plan` | Public client blueprint submission form |

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/sites` | Create new site record |
| `POST /api/sites/[id]/onboard` | Audit + auto-generate blueprint for new site |
| `POST /api/sites/[id]/blueprint` | Get/update site blueprint |
| `POST /api/blueprints/update` | External API for pushing blueprint updates (API key auth) |
| `POST /api/credentials` | Vault CRUD |
| `POST /api/blueprint-wizard` | AI blueprint generation (Sonnet 4.6) |
| `POST /api/blueprint-cleanup` | Text normalization for blueprint card fields |
| `POST /api/image-gen` | ComfyUI proxy — `{ prompt, width?, height?, steps?, checkpoint? }` → `{ image: "data:image/png;base64,...", filename, prompt_id }` |
| `GET /api/site-audit` | ❌ Does NOT exist — use POST only |
| `POST /api/site-audit` | Crawl + score a site (SEO, security, perf) |
| `POST /api/build-trigger` | Trigger a build pipeline job |
| `GET /api/build-status/[jobId]` | Check build job status |

### Blueprint Push (external use)
```bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \
  -H "content-type: application/json" \
  -d '{"siteId": "<UUID>", "nodes": [...], "edges": [...], "summary": "..."}'
```
Resolve site name → UUID: `supabaseAdmin.from('sites').select('id,name')`

### Image Generation (ComfyUI)
```bash
curl -X POST http://localhost:3000/api/image-gen \
  -H "content-type: application/json" \
  -d '{"prompt": "modern website hero, photorealistic", "width": 1024, "height": 1024}'
```
ComfyUI must be running locally at `127.0.0.1:8000`. Use `comfy:gen` skill for MCP-direct generation.

---

## Env Vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # used only for browser auth fallback (rare)
SUPABASE_SERVICE_ROLE_KEY        # primary — all server DB access
ADMIN_SECRET                     # vault session cookie signing
ANTHROPIC_API_KEY                # blueprint-wizard + blueprint-cleanup
COMFY_URL                        # default: http://127.0.0.1:8000
COMFY_CHECKPOINT                 # default: sd_xl_base_1.0.safetensors
```

---

## Vocabulary

- "Blueprint" = @xyflow/react node-graph canvas per client site (not a generic plan)
- "Vault" = AES-256-GCM credential store (not a generic secret manager)
- "Branch" = a named snapshot of a blueprint's nodes/edges (not a git branch)
- "Submission" = a client-submitted blueprint request via /plan (not a form in general)
- "Onboard" = the automated audit → blueprint pipeline for new sites

---

## Decision Defaults

| User says / context | Default action |
|---|---|
| Mentions a client site | Look up its ID: `GET /api/sites` before doing anything |
| "add a site" | `POST /api/sites` then `POST /api/sites/[id]/onboard` |
| "update the blueprint" | Use `POST /api/blueprints/update` with the site UUID |
| "push to dispatch" | Same as blueprint update — also called "push to manage-worker-bee" |
| "generate an image" | Use `comfy:gen` skill (MCP direct) or `/api/image-gen` (local dev) |
| "store a credential" | Add to vault via `/api/credentials` — never in source or env |
| Site not found in GET /api/sites | It hasn't been registered — create it first |

---

## Failure Patterns

- Calling `GET /api/site-audit` — only POST exists; GET returns empty response silently
- Using the wrong onboard call pattern — `POST /api/sites/[id]/onboard` calls `/api/site-audit` as POST now (was GET — fixed 2026-05-21 commit ef6ad46)
- Importing `supabaseAdmin` from a Client Component — service role key leaks to browser
- Editing vault encryption logic in `lib/vaultStore.ts` without explicit user request — AES-GCM is correct; touching it risks corrupting stored credentials
- Creating a "branch" in blueprintStore without preserving existing branches — always spread existing branches: `{ ...existing.branches, [newBranch]: {...} }`
- Assuming `COMFY_URL` is reachable in production — ComfyUI runs locally; image-gen only works in local dev

---

## Delegation Matrix

| Decision | Default |
|---|---|
| Adding routes, components, API endpoints | Just do it |
| Blueprint data model changes | Just do it — document in CLAUDE.md |
| Vault encryption algorithm changes | Ask — risk of credential corruption |
| Adding new env vars to production | Just do it — document here |
| Dropping sites table rows | Ask |
| Deleting vault credentials | Ask |
| Changing ADMIN_SECRET | Ask — invalidates all vault sessions |

---

## Output Contract

After completing work on this project:
1. List files changed (path:line for important hunks)
2. State what was NOT done (out of scope or deferred)
3. Note any new env vars or setup required
4. Note breaking changes to the blueprint API callers
5. Push blueprint update to manage.worker-bee.app if architecture changed
6. Suggest next logical step but don't take it

---

## Memory Triggers

- User mentions a client site name → look it up in `GET /api/sites` before answering
- User mentions "dispatch" → they mean manage-worker-bee / the blueprint system
- User asks about a past build decision → run mem-search before guessing
- User returns after a gap → mem-search recent manage-worker-bee work
