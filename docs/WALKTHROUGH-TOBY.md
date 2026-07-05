# Worker Bee — Toby's Recall Guide

Last updated: 2026-07-02
Live at: https://manage.worker-bee.app

---

## 1. What This Is

`manage.worker-bee.app` is your internal ops dashboard for running the Worker Bee agency. It tracks every client site, stores encrypted credentials, captures contact form submissions, manages invoices, monitors uptime, and houses the Blueprint canvas that shows each site's architecture as a visual node graph.

---

## 2. The Dashboard — Route Reference

| Route | What it does |
|---|---|
| `/sites` | Master list of all registered client sites. Each card shows status, stack, last pipeline run score, and links to the Blueprint canvas and site detail page. Click a site name to open its detail view. |
| `/sites/[id]` | Single site detail: metadata (GitHub repo, Vercel project, stack, status), the Blueprint canvas preview, design schemes, Visual QA card, and a video embed if one is set. |
| `/sites/new` | Register a new site. Fill in name, URL, stack, GitHub repo. After saving, run `/api/sites/[id]/onboard` to auto-generate the first blueprint. |
| `/monitor` | Live uptime dashboard. Pings every registered site every 60 seconds, shows latency and HTTP status. Green = up, red = down. |
| `/billing` | Invoice management. Lists all invoices with status (draft / sent / paid / overdue), totals, and client names. Summary stats at the top (total billed, outstanding, paid this month). |
| `/billing/new` | Create a new invoice. Pick a site, set client name and email, add line items by category (service, AI cost, hosting, affiliate setup, maintenance), set due date and optional tax rate. |
| `/billing/[id]` | Invoice detail. Shows all line items, totals, status badge. Actions: mark paid, send client link, download PDF. |
| `/clients` | Client records. Each client has a name, email, phone, status (new / scoped / quoted / approved / in_progress / complete / declined), and links to their associated sites and invoices. |
| `/clients/new` | Add a new client. Required: name. Optional: email, phone, company, notes. |
| `/clients/[id]` | Client detail: contact info, linked sites, milestone progress bar, invoice history, and request log. |
| `/vault` | Encrypted credential store. Add, search, and copy credentials by category. The master password is stored in the `vault_session` cookie — no re-entry needed between page loads on the same browser. |
| `/submissions` | Incoming blueprint requests submitted via the public `/plan` form. Each submission contains the client's business name, vision, style preferences, and page list. Includes AI-generated outputs (CLAUDE.md, settings.json, HTML starter). |
| `/requests` | General inbound work requests from clients — phone, email, form, or message. Each request has status, estimated hours, estimated cost, and links to client + site. |
| `/leads` | Sales pipeline. Prospects move through stages: New → Active → Engaged → Hot → Talking → Proposal → Won/Lost. Tracks touch count (Email 1, Text 1, Call 1, etc.) and deal value. |
| `/configurator` | Generates a `CLAUDE.md` and `settings.json` for a new client project from a form. Select stack (Next.js, WordPress, React, static), add routes, toggle Supabase/Tailwind/TypeScript. Download or copy the output. |
| `/analytics` | GA4 analytics view across all registered sites. Pulls measurement IDs from site configs and shows session/event data per property. |
| `/audits` | Saved site audit results. Each audit covers SEO score, security headers, performance. Stored in Supabase Storage under `build-logs/audits/`. |
| `/campaigns` | Email campaigns (broadcast and drip) across your language SaaS properties. Shows status (draft / scheduled / sending / sent), recipient count, and subject line. |
| `/contacts` | Email subscriber list. Filterable by site, subscription status, and tags. Supports export and bulk delete. |
| `/marketing` | Marketing campaign tracker for all sites. Shows campaigns by status (draft / active / completed / paused), platforms, and content types. |
| `/marketing-command` | High-level marketing command center: prospects pipeline summary, active offers, outstanding marketing tasks, and site-by-site GTM status. |
| `/marketing-push` | Marketing push interface — triggers AI-driven marketing droids (PRLog, Reddit, GBP agents). Shows task queues (completed / todo / could-do) per droid. |
| `/builds` | Build pipeline job tracker. Shows jobs in stages (queued / building / iterating / deploying / done / error) with phase indicators (research → scaffold → visual-loop → deploy) and score. |
| `/build-studio` | Terminal + live preview, accessed via Tailscale. Full Claude Code terminal embedded in the browser. |
| `/build-zone` | Intake-to-build pipeline. Sites that have submitted the intake form but haven't been built yet appear here. |
| `/batch` | Batch dispatch: trigger build or maintenance runs across multiple sites at once. Only shows active sites with a GitHub repo set. |
| `/maintenance` | Maintenance hub: schedule or trigger maintenance runs on live sites. |
| `/mods` | Pronto translation and SEO mod dispatcher. Select a site, pick a mod type, dispatch to the build machine. |
| `/iterations` | Visual QA iteration log for medical demo sites. Shows each iteration's design params (palette, typography, identity), pass/fail, and screenshots. |
| `/ship-ready` | Pre-ship checklist per site: SEO, security (CSO), CEO review, and client handoff. Links to Build Studio. |
| `/monetization` | Revenue tracking across all site types. Shows monthly revenue by site category (climbing, auto repair, language SaaS, etc.). |
| `/flow-boards` | User journey maps on a cork board canvas. Trace every step from landing page to paid subscriber. |
| `/neural-map` | Agent ecosystem visualization — shows the ATLAS/TAC/Maxwell/COMMAND network. |
| `/tetrad` | TETRAD war room: a multi-agent chat interface for strategic sessions. |
| `/white-label` | White-label offer details and feature list for the auto repair / trades package. |
| `/white-labels` | All white-label and product sites in the system, categorized. |
| `/language-lens` | LinguaLens app analytics — session counts, feedback rates, error logs, scenario breakdowns. |
| `/sitemap-visual` | Visual tree of all dashboard routes with descriptions. Good for orientation. |
| `/help` | Help index: descriptions of every major section with navigation links. |

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
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \
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
