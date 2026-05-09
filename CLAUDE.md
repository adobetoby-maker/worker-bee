@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # localhost:3000
npm run build
# No lint or test scripts
```

## Architecture

Internal dashboard for managing client sites. Auth is disabled (`proxy.ts` is a passthrough — open internal tool).

**Single Supabase client** (`lib/supabase.ts`) — service role only, no SSR cookie variants needed.

**Key stores:**
- `lib/blueprintStore.ts` — reads/writes `{siteId}.json` to Supabase Storage (`blueprints` bucket). Data model: `{ currentBranch, branches: Record<name, {nodes, edges, updatedAt}>, summary }`. Handles legacy migration from flat `{nodes, edges}` format.
- `lib/vaultStore.ts` — AES-256-GCM encrypted credential store. Master password stored encrypted in `vault_session` cookie (signed with `ADMIN_SECRET`) so any server instance can reconstruct it without re-login.

**Routes:**
- `/(dashboard)/sites/` — client site list + detail (blueprint canvas via `@xyflow/react`)
- `/(dashboard)/configurator/` — generates `CLAUDE.md` + `settings.json` for new client projects
- `/(dashboard)/vault/` — encrypted credential manager
- `/(dashboard)/submissions/` — incoming client blueprint submissions
- `/plan` — public client blueprint submission form
- `/api/blueprints/*`, `/api/credentials/*` — CRUD
- `/api/blueprint-cleanup` — AI-powered text normalization for blueprint card fields
- `/api/blueprint-wizard` — AI blueprint generation/refinement (Sonnet 4.6)
- `/api/image-gen` — ComfyUI image generation proxy (see below)

## Image Generation

ComfyUI runs locally at `127.0.0.1:8000` with SDXL Base 1.0. You can generate images two ways:

**1. Via API route** (when running `npm run dev` locally):
```bash
curl -X POST http://localhost:3000/api/image-gen \
  -H "content-type: application/json" \
  -d '{"prompt": "modern auto repair shop exterior, golden hour, photorealistic", "width": 1024, "height": 1024}'
```
Returns `{ image: "data:image/png;base64,...", filename, prompt_id }`.

**2. Via MCP plugin** (preferred — direct, no polling overhead):
Use the `comfy` MCP tools: `create_workflow` → `enqueue_workflow` → monitor → `list_output_images`.

**When to generate images:**
- Hero backgrounds and section images for client sites
- Logo concepts or brand visuals
- Product/service photography mockups
- Save generated images to the client project's `public/images/` directory

**Prompting for web images:** Be specific about lighting, mood, and subject. Avoid generating images with text (use `negative_prompt: "text, watermark, letters, words"`). SDXL works best at 1024×1024 or 1216×832 (landscape).

**Env vars:**
```
COMFY_URL         # default: http://127.0.0.1:8000
COMFY_CHECKPOINT  # default: sd_xl_base_1.0.safetensors
```
