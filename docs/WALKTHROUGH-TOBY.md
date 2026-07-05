# Worker Bee — Toby's Recall Guide

Last updated: 2026-07-05 (Phase 5 consolidation — six sections, ~19 pages retired to `app/_retired/`)
Live at: https://manage.worker-bee.app

---

## 1. What This Is

`manage.worker-bee.app` is your internal ops dashboard for running the Worker Bee agency. It tracks every client site, stores encrypted credentials, captures contact form submissions, manages invoices, monitors uptime, and houses the Blueprint canvas that shows each site's architecture as a visual node graph.

---

## 2. The Dashboard — Route Reference (six sections)

Everything reachable from the sidebar's six sections. Anything not listed here
was retired 2026-07-05 into `app/_retired/` (still in git, returns 404 live).

### Today + Portfolio

| Route | What it does |
|---|---|
| `/today` | The home screen. ATLAS state made ambient: staleness chip ("ATLAS live · synced Xm ago"), latest daily brief, NEED queue (top 10 by score), missions with gate/beauty/state pills, QA board strip, agent health tiles, tap queue, pending commands, unpaid invoices. Synced by the Bridge every ~5 min. |
| `/portfolio` | The unified build registry (`properties` table, ~139 rows). Filter chips by kind (client-site / demo / saas / white-label-instance / content / internal / pro-bono) and lifecycle; search; QA state dot per row; MRR/mo column. |
| `/portfolio/[slug]` | Property detail: all registry fields, inline MRR editor (pencil icon → saves via PATCH), blueprint link (loose-matched sites row), QA run history + Run QA button. |

### Clients & Money

| Route | What it does |
|---|---|
| `/clients`, `/clients/new`, `/clients/[id]` | Client records: contact info, status lifecycle (new → scoped → quoted → approved → in_progress → complete / declined), linked sites, milestones, invoices, requests. |
| `/billing` | The Money view. Top strip: recurring revenue from `properties.mrr_cents` (honest "$0 tracked" empty state until registry rows carry MRR) with Portfolio link; then total invoiced / outstanding / paid this month / drafts; then the invoice list. |
| `/billing/new`, `/billing/[id]` | Create invoice (line items by category, tax, due date); detail with mark-paid, client link, PDF. |
| `/contacts` | Email subscriber list. Filterable by site, status, tags; export and bulk delete. |

### Acquisition

| Route | What it does |
|---|---|
| `/leads`, `/leads/pipeline` | Sales pipeline: New → Active → Engaged → Hot → Talking → Proposal → Won/Lost, touch tracking, deal value; pipeline board view. |
| `/requests` | Inbound work requests (public `/request` funnel) with status, est. hours/cost, client + site links. |
| `/submissions` | Blueprint requests from the public `/plan` form, with AI-generated starters. |
| `/campaigns` | Email campaigns (broadcast/drip) across the language SaaS properties. |
| `/marketing` | Campaign plans tracker (draft / active / completed / paused) per site. |
| `/analytics` | GA4 view across registered sites; links each site's Config page to set `GA_PROPERTY_ID`. |

### QA & Repair

| Route | What it does |
|---|---|
| `/monitor` | Live uptime dashboard — pings every registered site, latency + HTTP status, auto-refresh. |
| `/maintenance` | Maintenance hub: schedule or trigger maintenance runs. |
| `/audits` | Saved site audit results (SEO / security / performance). |
| `/ship-ready`, `/ship-ready/[siteKey]` | Pre-ship checklist per site: SEO, CSO, CEO review, handoff. |

### Vault & Blueprint

| Route | What it does |
|---|---|
| `/vault` (+`/vault/add`, `/vault/edit`) | AES-256-GCM encrypted credential store. |
| `/sites`, `/sites/new`, `/sites/[id]` | Registered client sites + blueprint canvas. Per-site subpages: `blueprint`, `build` (+`/progress`), `portal`, `costs`, `time`, `milestones`, `config` (GA + key/value config), `edit` (metadata). The old per-site CMS page is retired. White-label quick card now points at `/portfolio?kind=white-label-instance`. |
| `/build-studio` | Embedded terminal + live preview (Tailscale). |
| `/builds` | Build pipeline job tracker for `/plan`-funnel jobs (queued → building → iterating → deploying → done/error). |
| `/build-zone` | Intake-to-build: sites with intake submitted but not yet built. |

### Retired (2026-07-05 — in `app/_retired/`, 404 live)

marketing-command, marketing-push, flow-boards, sitemap-visual, configurator,
tetrad, neural-map, `/invoices` (use `/billing`), mods, batch, iterations,
build-offer, white-label, white-labels (+builder), language-lens (its `lt_*`
tables don't exist in this database), overview-legacy (the pre-Today home),
help, monetization (+earnings — MRR now lives on `/billing`), sites/[id]/cms.

---

## 3. Managing Client Sites (Blueprint)

The Blueprint is a node-graph canvas (built with `@xyflow/react`) that shows a site's architecture visually. Each node represents a page, section, component, API route, or data layer.

### Opening a Blueprint
Go to `/sites`, find the site, click the Blueprint icon or the site name, then click "View Blueprint" on the detail page.

### Blueprint Branches
Each site has named blueprint branches (like git branches, but for the canvas). The default is `main`. You can create a new branch to explore a redesign without overwriting the current architecture.

Rule: always spread existing branches when writing a new one — never overwrite. The data model is:
```
{ currentBranch, branches: { main: { nodes, edges, updatedAt }, v2: {...} }, summary }
```

### Pushing a Blueprint Update (from Claude Code)
```bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \
  -H "x-api-key: $(grep '^BLUEPRINT_API_KEY=' ~/.claude/api-keys.env | cut -d= -f2)" \
  -H "content-type: application/json" \
  -d '{"siteId": "<UUID>", "nodes": [...], "edges": [...], "summary": "..."}'
```

### Onboarding a New Site
1. Go to `/sites/new`, fill in name, URL, stack, GitHub repo. Save.
2. Get the new site's UUID from the sites list.
3. Call: `POST /api/sites/[id]/onboard` — this runs a site audit and auto-generates the first blueprint.

---

## 4. Vault

The Vault is an AES-256-GCM encrypted credential store. It lives in Supabase but everything sensitive is encrypted client-side before writing.

### What it stores
| Category | What it's for |
|---|---|
| `login` | Username/password pairs for any service |
| `api-key` | API keys (Stripe, OpenAI, Cloudflare, etc.) |
| `database` | Supabase URLs, connection strings |
| `ssh` | SSH private keys, server access |
| `env` | Environment variable values that don't belong in source |
| `note` | Any sensitive text (contract notes, master passwords, etc.) |

### Adding a credential
1. Go to `/vault`
2. Click the + button
3. Fill in: label, category, username (if applicable), the secret value, and optionally the project name and URL it belongs to
4. Save — it's encrypted immediately

### Retrieving a credential
Search by label or project name. Click the eye icon to reveal, or use the copy button to copy to clipboard without revealing.

### What NOT to do
- Do not touch the encryption logic in `lib/vaultStore.ts` or `lib/vaultCrypto.ts` — AES-GCM is correct; editing it risks corrupting every stored credential
- Do not store credentials in `.env` files, CLAUDE.md, or source code — use the Vault
- Do not change `ADMIN_SECRET` without understanding it invalidates all vault sessions

---

## 5. Submissions

Submissions are blueprint requests sent by prospective or current clients through the public form at `manage.worker-bee.app/plan`.

### What a submission contains
- Business name and email
- Business description and target audience
- Desired CTA, style preferences, and page list
- AI-generated outputs: a draft `CLAUDE.md`, `settings.json`, HTML starter, and Tailwind starter

### To view submissions
Go to `/submissions`. Each card shows the submitter's info, the pages they listed, and their style notes. Click to expand and see the AI-generated outputs.

### Following up
There is no built-in email trigger on submission. The follow-up is manual:
1. Note the business name and email from the submission card
2. iMessage or email the prospect
3. If they become a client, create them in `/clients` and register the site in `/sites`

---

## 6. Clients

### Adding a client
Go to `/clients/new`. Required field is name. Fill in email, phone, company name, and any notes. Save.

### Fields that matter
| Field | Why |
|---|---|
| Name | Appears on invoices and in search |
| Email | Used as the invoice recipient — must be correct before sending |
| Phone | For your own reference / iMessage contact |
| Status | Tracks where they are in the engagement lifecycle |
| Notes | Anything relevant — scoping notes, referral source, quirks |

### Linking a site to a client
On the client detail page (`/clients/[id]`), use the Link Site panel to associate one or more sites with this client. Once linked, the client detail shows milestone progress and invoice history for those sites.

### Client statuses
`new` → `scoped` → `quoted` → `approved` → `in_progress` → `complete`
(or `declined` if the deal doesn't go through)

---

## 7. Invoices

### Creating an invoice
1. Go to `/billing/new`
2. Select the associated site (or leave blank for a standalone invoice)
3. Enter client name and email — this is what appears on the PDF
4. Add line items. Each item needs: description, category (service / AI cost / hosting / affiliate setup / maintenance), quantity, and unit price
5. Set the issued date, due date, and tax rate (0% if no tax applies)
6. Add any notes (payment instructions, etc.)
7. Save as Draft

### Statuses
| Status | Meaning |
|---|---|
| `draft` | Created but not sent. You can still edit everything. |
| `sent` | Client has been given the link. Do not edit line items. |
| `paid` | Payment received. Click "Mark Paid" on the invoice detail page. |
| `overdue` | Past due date, not paid. The dashboard will highlight these. |

### Sending to a client
After creating the invoice and confirming the line items are right:
1. Open the invoice detail (`/billing/[id]`)
2. Use the "Send Client Link" action — this gives you a shareable URL to forward to the client
3. The client can view the invoice and see the PDF version at that URL
4. Mark the status as `sent`

### Marking paid
Open the invoice detail → click "Mark as Paid". This records the `paid_at` timestamp and flips the status to `paid`.

---

## 8. Common Tasks — 30-Second Recipes

### "New client site just launched — add it"
1. `/sites/new` → fill in name, URL, stack (nextjs / wordpress / react / static), GitHub repo → Save
2. Note the UUID from the sites list
3. `POST /api/sites/[id]/onboard` to auto-generate the blueprint
4. Go to `/clients` → find or create the client → Link the new site on their detail page

### "Client submitted a contact form — follow up"
1. Go to `/submissions` — find the submission by business name or date
2. Read their vision and page list
3. iMessage or email them directly (the email is on the submission card)
4. When they're ready to proceed: `/clients/new` → `/sites/new` → run onboard

### "Need to send Allen an invoice"
1. `/billing/new` → select Allen's site → enter his email
2. Add line items (what you built, how much)
3. Save → open the invoice detail → copy the client link → send it to Allen
4. After he pays, open the invoice → Mark as Paid

### "Store a new API key securely"
1. `/vault` → click + → category: api-key
2. Label it clearly (e.g. "Stripe Test Key — jrs-auto-repair")
3. Paste the key value → set the project name → Save
4. To retrieve later: search by label or project name, click Copy

### "Check if all sites are up"
1. `/monitor` — auto-refreshes every 60 seconds
2. Green rows = HTTP 200, red rows = down or slow
3. If a site is red: check the site's Vercel dashboard or run `curl -sI <url>` from terminal

---

## 9. What Lives Here vs Elsewhere

| Thing | Where it lives | NOT in manage.worker-bee |
|---|---|---|
| Client site code | `/Users/drive/<project>/` | manage.worker-bee is for ops, not code |
| Site credentials | Vault (`/vault`) | Not in `.env` files or git |
| Invoice records | `/billing` | Not in spreadsheets |
| Client contact info | `/clients` | Not in iMessage or Notes |
| Site architecture | Blueprint canvas (`/sites/[id]`) | The actual code is in the project folder |
| Git secrets / CI tokens | Project `.env.local` or Vercel env vars | Do NOT put these in the Vault unless also needed at ops time |
| Supabase service role key | `.env.local` + Vercel | The Vault holds things you look up manually — not things Next.js reads at runtime |
| Blog posts / content | `lib/articles.ts` in jrs-auto-repair | manage.worker-bee has no blog |
| Build pipeline output | `/builds` route + Supabase `wb_pipeline_runs` table | Not in manage.worker-bee's own codebase |

**The single rule:** manage.worker-bee.app is a control panel, not a codebase. Everything you can see or click here reflects state stored in Supabase. The actual sites' code, configuration, and deployment live in their own project folders.
