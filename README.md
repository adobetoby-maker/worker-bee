# Worker-Bee Management Platform

Internal agency dashboard at `manage.worker-bee.app` for managing client sites, blueprints, credentials, and AI-powered site builds.

## Running Locally

```bash
npm run dev   # http://localhost:3000
npm run build
```

No lint or test scripts.

## What's Inside

| Route | Purpose |
|---|---|
| `/(dashboard)/sites/` | Client site list + detail (blueprint canvas) |
| `/(dashboard)/configurator/` | Generates `CLAUDE.md` + `settings.json` for new client projects |
| `/(dashboard)/vault/` | AES-256-GCM encrypted credential manager |
| `/(dashboard)/submissions/` | Incoming client blueprint submissions |
| `/plan` | Public client blueprint submission form |
| `/api/blueprints/*` | Blueprint CRUD |
| `/api/credentials/*` | Credential CRUD |
| `/api/blueprint-cleanup` | AI text normalization for blueprint card fields |
| `/api/blueprint-wizard` | AI blueprint generation/refinement (Sonnet 4.6) |
| `/api/image-gen` | ComfyUI image generation proxy |

## Architecture

**Auth:** Disabled — `proxy.ts` is a passthrough (internal tool only).

**Supabase** (`lihnuqymfxwkjhkzusvj`) — service role client only (`lib/supabase.ts`), no SSR cookie variants.

**Blueprints** (`lib/blueprintStore.ts`) — `{siteId}.json` in Supabase Storage (`blueprints` bucket). Data model: `{ currentBranch, branches: Record<name, {nodes, edges, updatedAt}>, summary }`. Handles legacy migration from flat `{nodes, edges}` format.

**Vault** (`lib/vaultStore.ts`) — AES-256-GCM. Master password stored encrypted in `vault_session` cookie (signed with `ADMIN_SECRET`) so any server instance can reconstruct it without re-login.

## Build Machine Pipeline

1. Blueprint canvas → AI Generate (wizard) → 6 identity nodes saved to Supabase Storage
2. Build page → select site type + mode (New Build / Iteration)
3. One-Click Build → POST spec to `build-api.worker-bee.app/run` (`x-api-key: wb-build-local-9f4a2c`)
4. Claude CLI runs: Phase 0 Research → Phase 1 Provision → Phase 2 Cards → Phase 2.5 Visual QA → Phase 3 /frontend-design → Phase 4 (3-pass review) → Phase 5 Deploy

**Iteration mode** skips scaffold and tells Claude to replace (not patch) existing code.

**`github_repo`** must be set on the site record — `localPath` is derived from `github_repo.split('/')[1]`.

## Image Generation

ComfyUI runs locally at `127.0.0.1:8000` with SDXL Base 1.0. Prefer the `comfy` MCP tools over the REST API (no polling overhead).

```bash
# Via REST (when running npm run dev):
curl -X POST http://localhost:3000/api/image-gen \
  -H "content-type: application/json" \
  -d '{"prompt": "modern shop exterior, golden hour, photorealistic", "width": 1024, "height": 1024}'
```

SDXL works best at 1024×1024 or 1216×832. Avoid generating text in images (`negative_prompt: "text, watermark, letters, words"`).

**Env vars:**
```
COMFY_URL         # default: http://127.0.0.1:8000
COMFY_CHECKPOINT  # default: sd_xl_base_1.0.safetensors
```

## MCP Plugins (`.mcp.json`)

| Server | Purpose |
|---|---|
| `supabase` | Database queries and schema management |
| `comfy` | ComfyUI image generation (`create_workflow` → `enqueue_workflow` → `list_output_images`) |
| `puppeteer` | Browser automation for QA and screenshots |

## Agent Skills (`.agents/skills/`)

| Skill | Source |
|---|---|
| `supabase` | `supabase/agent-skills` |
| `supabase-postgres-best-practices` | `supabase/agent-skills` |

## Deploy

```bash
vercel --prod --yes
vercel alias set <deployment-url> manage.worker-bee.app
```
