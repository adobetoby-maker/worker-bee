<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Manage Worker Bee — Project Context
Full context is in CLAUDE.md — read that first. This is the quick-ref.

## What This Is
Internal dashboard for managing all client sites. Auth is disabled (open internal tool — `proxy.ts` is a passthrough). No external users.

## Stack
- Next.js 16 + React 19 + Supabase (service role only) + ComfyUI image gen
- Machine: [SSH] Mac Studio (~/manage-worker-bee)

## Commands
```bash
npm run dev        # localhost:3000
npm run build
npm run start
# No lint or test scripts
```

## Deployment
- Live URL: https://manage.worker-bee.app
- Auth: open internal tool — no login required

## Key Stores
- `lib/blueprintStore.ts` — reads/writes `{siteId}.json` to Supabase Storage (`blueprints` bucket)
- `lib/vaultStore.ts` — AES-256-GCM encrypted credential store (master password in `vault_session` cookie)

## Supabase Client
Single client: `lib/supabase.ts` — service role only. No SSR cookie variants needed.

## AI Features
- `/api/blueprint-wizard` — blueprint generation (Sonnet 4.6)
- `/api/blueprint-cleanup` — text normalization
- `/api/image-gen` — ComfyUI proxy (requires local ComfyUI at 127.0.0.1:8000)

## Key Routes
- `/(dashboard)/sites/` — client site list + blueprint canvas (@xyflow/react)
- `/(dashboard)/configurator/` — generates CLAUDE.md + settings.json for new projects
- `/(dashboard)/vault/` — encrypted credential manager
- `/plan` — public client blueprint submission form

## DON'T TOUCH
- Vault encryption logic in `lib/vaultStore.ts` without being asked
