---
project: manage-worker-bee
category: nextjs-supabase-saas
deploy: vercel
lifecycle: active
last_verified: 2026-07-05
deployment_url: https://manage.worker-bee.app
---

# Manage Worker Bee — ATLAS Operator Console

Single-operator console for the Worker Bee estate. Projects ATLAS's state (NEEDs,
missions, QA, agent health, daily brief) onto the web, holds the unified property
registry, CRM, invoicing, vault, and blueprint canvas. PRD: `~/.atlas/docs/PRD-atlas-platform-2026-07-05.md`.

**Two platform laws (write them into every feature):**
1. The platform NEVER duplicates ATLAS state — `atlas_*` tables are Bridge-synced
   projections; ATLAS's files on the Mac Studio are the source of truth.
2. The platform NEVER executes work — buttons only enqueue `atlas_commands` rows.
   ATLAS's own hooks (DEPLOY/EYES/BLAST-RADIUS) still gate execution on its side.

---

## Auth — default-deny (fixed 2026-07-05, was a live hole)

- `middleware.ts` — default-deny. EVERYTHING requires the `wb_admin_session`
  cookie unless on the explicit allowlist (public pages `/`, `/login`,
  `/reset-password`, `/plan`, `/evaluate`, `/request`, `/pipeline`; token
  prefixes `/client/`, `/invoice/`; enumerated public APIs). Pages redirect to
  `/login`; APIs return 401 JSON.
- `lib/adminAuth.ts` — node runtime: `signToken`/`verifyToken` (HMAC-SHA256 with
  `ADMIN_SECRET`), `requireAdmin()` (redirects — page semantics only).
- `lib/adminAuthEdge.ts` — Web-Crypto re-implementation for the Edge middleware;
  pins the cookie value to `wb_admin`. Must stay in lockstep with `adminAuth.ts`.
- Machine endpoints enforce their own keys in-route: `/api/blueprints/update`
  (`BLUEPRINT_API_KEY`), `/api/wb-run` (`WB_RUN_API_KEY`), `/api/marketing/*`
  (`MARKETING_API_KEY`), `/api/cron/*` (`Bearer CRON_SECRET`).

## Six-section IA (Phase 5, 2026-07-05)

`app/(dashboard)/Sidebar.tsx` — the whole console is six sections; anything not
reachable from them is retired, not hidden:

| Section | Routes |
|---|---|
| Today (home) | `/today` (alias of `app/(dashboard)/page.tsx`; `/` is the public landing) |
| Portfolio | `/portfolio`, `/portfolio/[slug]` |
| Clients & Money | `/clients`, `/billing` (+MRR strip), `/contacts` |
| Acquisition | `/leads` (+`/leads/pipeline`), `/requests`, `/submissions`, `/campaigns`, `/marketing`, `/analytics` |
| QA & Repair | `/monitor`, `/maintenance`, `/audits`, `/ship-ready` |
| Vault & Blueprint | `/vault`, `/sites` (per-site: blueprint/build/portal/costs/time/milestones/config/edit), `/build-studio`, `/builds`, `/build-zone` |

**Retired pages live in `app/_retired/`** — out of routing (underscore = private
folder), out of `tsconfig.json` (excluded), still in git. Retired 2026-07-05:
marketing-command, marketing-push, flow-boards, sitemap-visual, configurator,
tetrad, neural-map, invoices (duplicate of /billing), mods, batch, iterations,
build-offer, white-label, white-labels, language-lens (its `lt_*` tables don't
exist in this Supabase), overview-legacy, help, monetization, sites-id-cms.
Their API routes were left in place. Restore = `git mv` back + remove tsconfig
exclusion if it's the last one.

## ATLAS Bridge + data model

- `atlas_health`, `atlas_briefs`, `atlas_needs`, `atlas_missions`, `atlas_qa`,
  `atlas_commands` — written every ~5 min by the Bridge daemon on the Mac Studio.
  Every row carries `synced_at`; Today shows an amber "last heard" banner when
  max(`atlas_health.synced_at`) > 15 min (never silently lie about freshness).
- Command path DOWN: UI inserts into `atlas_commands` (`queue-need`,
  `queue-mission`, `run-qa`, `approve-tap`); Bridge polls, dispatches into
  `~/.atlas/needs|missions/queue.md`, marks `dispatched`, receipts close the loop.
- `properties` — the unified build registry (~139 rows): slug, name, kind
  (client-site|demo|saas|white-label-instance|content|internal|pro-bono),
  lifecycle, client, repo_path, github_url, host, live_url, custom_domain,
  qa_slug (joins `atlas_qa`), mrr_cents, stack, built_by, notes. Rendered by
  `/portfolio`; MRR editable inline via `PATCH /api/portfolio/[slug]/mrr`.
- `lib/atlas-console.ts` — shared console helpers: `relTime`, `minutesSince`,
  `needTypeColor`, `qaStateStyle`, `qaLatestInfo`, `beautyColor` (≥7.5 green,
  6.5–7.4 amber, <6.5 red), KIND/LIFECYCLE color maps, `Property`/`QaRow`/
  `CommandRow` types. Extend here, not inline in pages.
- QA stamps: each site serves `/qa-status.json` + `/qa-badge.svg` (exempt from
  the auth matcher); full-monte scanner + QA board read them.

## Key stores (pre-console, all still live)

- `lib/supabase.ts` — single service-role client (`supabaseAdmin`), proxy-deferred
  init. Server-side only; importing it in a Client Component leaks the key.
- `lib/blueprintStore.ts` — blueprint JSON per site in Supabase Storage; branches
  model `{ currentBranch, branches: {name: {nodes, edges}}, summary }` — always
  spread existing branches when writing.
- `lib/vaultStore.ts` + `lib/vaultCrypto.ts` — AES-256-GCM vault. Do not touch
  encryption logic without an explicit ask.
- `lib/billing.ts` + `lib/invoices/` — invoice engine (complete; don't rebuild).

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | port 3000; add `-H 0.0.0.0` for Tailscale |
| `npm run build` | must pass; `app/_retired` is excluded from routing + tsc |
| `PORT=3210 npm run start` | local prod run for verification |
| `npm run test` | Vitest |
| `npx tsc --noEmit` | baseline 20 known errors (scan-gmail-replies 6, graphAnalysis 12, src/integrations 2) — zero NEW allowed |
| deploy | Vercel (project `manage-worker-bee`, crons in `vercel.json`). The `npm run deploy` OpenNext→Cloudflare script exists but is NOT the live path. |

## Env Vars (names only — values in `.env.local` / Vercel)

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # all server DB access
ADMIN_PASSWORD / ADMIN_SECRET    # login + cookie HMAC — ADMIN_SECRET MUST be set in prod
BLUEPRINT_API_KEY / MARKETING_API_KEY / WB_RUN_API_KEY / CRON_SECRET
ANTHROPIC_API_KEY                # blueprint wizard/cleanup
RESEND_API_KEY (+ RESEND_AUDIENCE_*)  # email + campaigns
SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT
NEXT_PUBLIC_GOOGLE_CLIENT_ID     # optional Google sign-in on /login
PRONTO_API_KEY / NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_TERMINAL_URL
```

## Decision Defaults

| Context | Default action |
|---|---|
| "add a page/feature" | It must hang off one of the six sections; if it can't, it doesn't ship |
| "console button that does work" | Insert an `atlas_commands` row — never call an execute path from the web |
| "invoices" | `/billing` — the `/invoices` list page is retired |
| "MRR / recurring revenue" | `properties.mrr_cents` — edit on `/portfolio/[slug]`, roll-up strip on `/billing` |
| "white label" | `/portfolio?kind=white-label-instance` — WL pages retired |
| "marketing push / droids" | Retired — Acquisition section (`/leads`, `/campaigns`, `/marketing`) supersedes |
| New mutating API route | Middleware covers it by default-deny, but ALSO verify the cookie in-route (see `app/api/portfolio/[slug]/mrr/route.ts`) |
| New public API/page | Add to the middleware allowlist explicitly + comment why it's public |
| "update the blueprint" | `POST /api/blueprints/update` with `x-api-key` from `~/.claude/api-keys.env` — never paste the key into docs |
| QA/beauty number shown in UI | Color with `beautyColor()` from `lib/atlas-console.ts` |
| Anything with old routes (help/sitemap-visual/tetrad…) | Check `app/_retired/` before assuming it's gone |

## Failure Patterns (real, dated)

- **requireAdmin-never-called (until 2026-07-05):** `requireAdmin()` existed in
  `lib/adminAuth.ts` but no page or route called it — the whole dashboard and
  APIs were publicly reachable. Fix: default-deny `middleware.ts`. Lesson: an
  auth helper that nothing calls is not auth; verify with anon `curl` → 401/307.
- **Explicit-alias domain pin (found 2026-07-05):** a stale explicit Vercel alias
  pinned manage.worker-bee.app to an old deployment for ~15 days — deploys
  "succeeded" but were never live. Domain must follow the production wildcard;
  after deploy, verify the LIVE domain serves the new build, not just the
  deployment URL.
- **Empty-`?token=` IDOR (found+fixed 2026-07-05):** middleware used
  `searchParams.has('token')` (true for empty string) while the route's
  `tokenParam &&` guard skipped empty — `/api/invoice-pdf/<id>?token=` bypassed
  both layers. Adversaries try degenerate inputs; carve-outs need truthy checks
  on both layers.
- **ADMIN_SECRET undefined===undefined class:** signer and verifier share the
  `?? 'dev-secret-change-me'` fallback — if prod ever loses `ADMIN_SECRET`, both
  sides agree on the fallback and cookies become forgeable. Never "fix" a
  missing-secret error by aligning fallbacks; set the env var.
- **`ts` must be ISO in qa-status (commit d1b5127):** `atlas_qa.latest.ts` /
  `qa-status.json` timestamps must be ISO-8601 strings per `atlas-full-monte/1`;
  epoch numbers render as "—"/NaN in `relTime`.
- Importing `supabaseAdmin` in a Client Component — service key in the browser bundle.
- Overwriting blueprint branches instead of spreading — silent data loss.
- `GET /api/site-audit` — only POST exists; GET fails silently.

## Delegation Matrix

| Decision | Default |
|---|---|
| Routes/components/API endpoints within the six sections | Just do it |
| Un-retiring a page or adding a seventh section | Ask |
| Vault encryption, `ADMIN_SECRET` rotation, dropping DB rows | Ask |
| Bridge schema changes (`atlas_*`) | Coordinate with `~/.atlas` side first — schema is versioned |

## Output Contract

1. `npx tsc --noEmit` — zero NEW errors vs the 20-error baseline; report delta.
2. `npm run build` passes; retired routes stay 404 (spot-check with curl).
3. Anon curl on any new route → 401/307 unless deliberately allowlisted.
4. Visual change → screenshots read + `.claude/verify/latest.md` table (verify-gate blocks otherwise).
5. Update `docs/WALKTHROUGH-TOBY.md` if routes changed; update this file if architecture changed.

## Memory Triggers

- Client/site name mentioned → `GET /api/sites` (blueprint id) + `properties` (registry row) before answering.
- "like the old dashboard" → it's `app/_retired/overview-legacy/`.
- Past decision questions → mem-search + `~/.atlas/docs/PRD-atlas-platform-2026-07-05.md` before guessing.
