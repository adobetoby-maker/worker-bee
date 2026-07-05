# Worker Bee Marketing Campaign OS PRD

Date: 2026-06-07
Owner: Dr. Toby Anderton / Anderton & Associates Group LLC
Primary app: /Users/drive/manage-worker-bee
Public face: https://andertongroup.com
Internal management app: https://manage.worker-bee.app

## 1. Product Name

Worker Bee Marketing Campaign OS

## 2. One-Sentence Goal

Turn the websites already built under /Users/drive into a repeatable revenue engine: portfolio proof, lead capture, campaign planning, outreach task execution, follow-up automation, and ROI tracking inside manage.worker-bee.app.

## 3. Why This Matters Now

The workspace already contains a large number of real website builds and several fresh local-service demo/client sites. The missing piece is not site-building capacity; it is a focused sales and marketing system that turns those built assets into money.

The current system already has useful pieces:

- andertongroup.com is the public agency face.
- andertongroup.com/start captures project inquiries.
- andertongroup.com rewrites /api/* to manage.worker-bee.app/api/*.
- manage.worker-bee.app stores leads, contacts, campaigns, marketing tasks, sites, blueprints, credentials, costs, time, milestones, and monitoring.
- manage-worker-bee has routes for Leads, Contacts, Campaigns, Marketing Campaigns, Marketing Push, Build Offer, White Label, Sites, Clients, Billing, Analytics, Monetization, and Vault.
- Supabase tables already exist for leads, contacts, campaigns, marketing_campaigns, marketing_tasks, platform_credentials, and sites.

The current gap: the pieces are not yet unified into a simple daily command center that says:

1. Which site/product should we sell?
2. Who should we contact?
3. What should we send/post?
4. Did it produce leads?
5. Which offers are making money?
6. What is the next money-making action?

## 4. Current Website Inventory

### 4.1 New/recent sites made or heavily updated June 6-7

These are the fresh/new site folders identified under /Users/drive from filesystem modification dates and package metadata:

1. language-threshold
2. co-landscaping-sandpoint
3. kalisz-construction
4. allied-plumbing-meridian
5. salvorias-marketplace
6. diffused-electrical-innovations
7. hb-saw-service
8. brux-fence-and-design
9. lovells-tree-service
10. js-painting-inc
11. tz-painting-llc
12. co-landscaping
13. gonzalez-painting-drywall
14. walker-appliance-rexburg
15. broken-rail-fence
16. bb-electric-boise
17. jl-anderson
18. michaels-hvac-cda
19. behrend-plumbing
20. precision-yardworks
21. booth-construction

Note: the prior image-quality pass focused on 18 contractor/local-service sites. language-threshold, co-landscaping-sandpoint, and salvorias-marketplace are also fresh/recent but may belong to different marketing buckets.

### 4.2 Larger portfolio / product ecosystem visible locally

The /Users/drive workspace also includes many marketable proof assets and products, including:

- anderton-associates — public agency site for andertongroup.com
- manage-worker-bee — internal agency/site-management dashboard
- worker-bee — Worker Bee product/site
- jrs-auto-repair
- silver-creek-logistics
- orthobiologic-pathways
- tobyandertonmd
- climb-france
- climb-brasil
- climb-spain
- climb-utah
- medicalspanish-app
- constructionspanish-app
- language-lens-elite
- lms-platform / lms-v2 / lms-ncmc / lms-vericore
- mountain-edge-general / mountain-edge-electrical / mountain-edge-training
- magic-valley-mechanical
- wl-service-company-plumbing
- anderton-contracting
- snake-river-law
- guy-grooms-md
- kyle-nay-dpm
- pack-crossfit-tf
- tfhra
- yoimi-sushi-tf
- sunrise-bakery
- swig-drinks
- baja-fish-guide
- marks-parent-coaching
- john-huber-baja

These should be categorized into monetization lanes rather than treated as one giant pile.

## 5. Current System Understanding

### 5.1 manage-worker-bee architecture

Stack:

- Next.js 16.2.4
- React 19.2.4
- Supabase service-role backend access only
- Cloudflare/OpenNext deployment path available via wrangler/open-next
- @xyflow/react blueprint canvas
- Anthropic SDK for blueprint/campaign generation
- Resend for email
- Playwright/visual QA routes with Cloudflare shims

Important local files inspected:

- /Users/drive/manage-worker-bee/CLAUDE.md
- /Users/drive/manage-worker-bee/package.json
- /Users/drive/manage-worker-bee/lib/supabase.ts
- /Users/drive/manage-worker-bee/lib/blueprintStore.ts
- /Users/drive/manage-worker-bee/lib/vaultStore.ts
- /Users/drive/manage-worker-bee/app/(dashboard)/Sidebar.tsx
- /Users/drive/manage-worker-bee/app/(dashboard)/leads/page.tsx
- /Users/drive/manage-worker-bee/app/(dashboard)/campaigns/page.tsx
- /Users/drive/manage-worker-bee/app/(dashboard)/marketing/page.tsx
- /Users/drive/manage-worker-bee/app/(dashboard)/marketing-push/page.tsx
- /Users/drive/manage-worker-bee/app/(dashboard)/build-offer/page.tsx
- /Users/drive/manage-worker-bee/app/api/leads/route.ts
- /Users/drive/manage-worker-bee/app/api/sites/route.ts
- /Users/drive/manage-worker-bee/app/api/marketing/campaigns/route.ts
- /Users/drive/manage-worker-bee/app/api/marketing/tasks/route.ts
- /Users/drive/manage-worker-bee/app/api/ai/campaign-builder/route.ts
- /Users/drive/manage-worker-bee/supabase/migrations/20260530140000_leads.sql
- /Users/drive/manage-worker-bee/supabase/migrations/20260530130000_marketing_campaigns.sql
- /Users/drive/manage-worker-bee/supabase/migrations/20260530110000_marketing_tasks.sql
- /Users/drive/manage-worker-bee/supabase/migrations/20260529_email_platform.sql

Core data stores:

- Supabase `sites`: all managed website records.
- Supabase Storage bucket `blueprints`: {siteId}.json blueprint graphs.
- Supabase `leads`: inbound prospects from andertongroup.com/start.
- Supabase `contacts`: per-site email audience/subscribers.
- Supabase `campaigns`: email broadcast/drip campaigns.
- Supabase `marketing_campaigns`: weekly multi-platform campaign plans per site.
- Supabase `marketing_tasks`: marketing agent task queue / todo / could-do / completed log.
- Supabase `platform_credentials`: planned per-site platform connection credentials.
- Supabase `vault_storage` / `credentials`: encrypted credential storage.

### 5.2 Public funnel mechanics

andertongroup.com:

- Public agency brand: Anderton & Associates Group LLC.
- Positions services as web design/dev, CRM/client portals, digital marketing, SEO/content, social integration, automation.
- Has /start route with multi-step intake form.
- Has /plan route with visual blueprint planner.
- Has public portfolio component powered by /Users/drive/anderton-associates/lib/portfolio.ts.
- next.config.ts rewrites `/api/:path*` to `https://manage.worker-bee.app/api/:path*`, so public form submissions reach the management app without exposing a separate backend domain to users.

manage.worker-bee.app:

- Public home page offers Plan Only, Plan & Execute, and 10x It flows.
- Dashboard link leads into internal site management.
- The app is currently described as open internal tooling in CLAUDE.md, with no external users.

### 5.3 Current monetization pages/modules

Existing dashboard areas relevant to money:

- /leads — shows inbound leads with status: new, contacted, scoped, won, lost.
- /contacts — audience/subscriber management.
- /campaigns — email broadcasts/drip sequences.
- /marketing — weekly cross-platform campaign planning and approval.
- /marketing-push — channel/droid task board and backlink/submission tracking.
- /build-offer — internal contractor website offer page currently priced around $1,999 starter and $2,498 starter + portal.
- /white-label and /white-labels — white-label packaging path.
- /monetization — existing monetization section.
- /billing — billing/invoices area.
- /clients and /sites — CRM/project inventory.

## 6. Product Strategy

### 6.1 The money lanes

Worker Bee should organize the portfolio into 5 monetization lanes:

1. Local Contractor Website Builds
   - Target: plumbers, electricians, HVAC, painting, fencing, landscaping, appliance repair, tree service, construction.
   - Proof assets: the June 6-7 local-service sites.
   - Offer: 8-page lead-generating website in 2 weeks.
   - Price target: $1,999 starter; $2,498 starter + portal; $199-$499/month maintenance/SEO optional.

2. Local Business Refresh / 10x Audit
   - Target: businesses with old/weak websites.
   - Proof: Worker Bee audit/evaluate/ship-ready flows.
   - Offer: site audit + prioritized fixes + rebuild option.
   - Price target: free/low-cost audit as lead magnet; $750-$2,500 implementation sprint.

3. Industry Micro-SaaS / LMS Products
   - Target: niche education/training markets.
   - Proof: medicalspanish-app, constructionspanish-app, language-threshold, LMS projects.
   - Offer: sell subscriptions or white-label training platforms.
   - Price target: $29-$199/month user/product subscriptions; B2B white-label packages $2,500-$10,000.

4. Medical / Professional Authority Sites
   - Target: physicians, clinics, professional service providers.
   - Proof: orthobiologic-pathways, tobyandertonmd, guy-grooms-md, kyle-nay-dpm.
   - Offer: authority website + patient education + SEO content system.
   - Price target: $3,500-$15,000 depending on portal/content depth.

5. White-Label Worker Bee OS
   - Target: agencies, consultants, creators who want a site-building operating system.
   - Proof: manage-worker-bee itself.
   - Offer: branded dashboard + blueprint + campaign + monitoring system.
   - Price target: $2,499 setup plus $99-$499/month.

### 6.2 First campaign recommendation

Start with Local Contractor Website Builds.

Reason:

- The workspace has many fresh contractor/local-service demos.
- The offer is easy to understand.
- The pain is clear: outdated/no site, weak Google presence, missed calls/leads.
- Local businesses can buy quickly without long enterprise sales cycles.
- The sites are visually concrete proof.

Primary offer:

“Get a professional 8-page contractor website built in 2 weeks for $1,999. We show you a live preview first. If you do not like it, you do not launch.”

Secondary offer:

“Free 10x website audit: see what is costing you calls, leads, and trust.”

## 7. Target Users

### 7.1 Toby / internal operator

Needs:

- See all marketable sites grouped by niche.
- Pick a campaign lane.
- Generate emails/posts/directories/tasks from templates.
- Track leads and follow-ups.
- See revenue potential and wins.

### 7.2 Sales assistant / agent droids

Needs:

- Pull tasks from marketing_tasks.
- Know which site/offer/channel to work on.
- Write back status, output, links, and next action.
- Avoid spammy behavior and preserve brand trust.

### 7.3 Prospective client

Needs:

- Understand the offer in under 10 seconds.
- See examples that look relevant to their industry.
- Submit a form with minimal friction.
- Receive a professional confirmation and follow-up.

## 8. Core Requirements

### Phase 1 — PRD + inventory foundation

1. Add this PRD to manage-worker-bee docs.
2. Add a simple `marketing_site_inventory` concept, initially generated from local /Users/drive folders or manually seeded.
3. Categorize each built site into:
   - contractor/local service
   - medical/professional
   - language/LMS/SaaS
   - climbing/content
   - internal platform
   - other
4. Track each site's marketing status:
   - not reviewed
   - portfolio-ready
   - needs polish
   - live client proof
   - demo/spec proof
   - campaign active
5. Track each site's offer lane and CTA URL.

Acceptance criteria:

- A page in manage-worker-bee shows the marketing inventory grouped by category.
- Each site has a status, lane, URL, repo path, and next marketing action.
- June 6-7 contractor sites are visible as a batch.

### Phase 2 — Campaign command center

Build a new dashboard route:

- /marketing-command

Purpose:

A single screen that answers “what do I do today to make money?”

Sections:

1. Revenue lanes
   - Local Contractor Builds
   - 10x Audit / Rebuilds
   - LMS / Language Products
   - Medical Authority Sites
   - White-Label OS

2. Active offers
   - Offer name
   - Price
   - Landing page
   - Proof sites
   - Target audience
   - Current campaign status

3. Today’s actions
   - 5 direct outreach tasks
   - 3 social/content tasks
   - 3 directory/backlink tasks
   - 1 follow-up task for each new/contacted lead

4. Lead funnel
   - new leads
   - contacted
   - scoped
   - won
   - lost
   - expected pipeline value

5. Proof library
   - sites ready to show prospects
   - screenshots/URLs
   - niche tags

Acceptance criteria:

- Toby can open one route and know exactly what to do next.
- The page uses existing Supabase tables where possible.
- No duplicate campaign system unless necessary; unify current /campaigns, /marketing, and /marketing-push concepts through links and shared data.

### Phase 3 — Contractor campaign generator

Add a campaign generator for local contractor offers.

Inputs:

- Business category: plumber, electrician, HVAC, painter, landscaper, fence, tree service, construction, appliance repair.
- Location: Boise, Meridian, Twin Falls, Idaho Falls, Rexburg, Coeur d’Alene, Sandpoint, etc.
- Proof site(s) to reference.
- Offer: Starter Site, Starter + Portal, Website Refresh, Free Audit.
- Channel: email, Craigslist, Facebook group, Google Business/Profile task, directory, LinkedIn, Nextdoor, Reddit/Quora/forum.

Outputs:

- Email subject variants.
- Cold email copy.
- Follow-up email copy.
- Craigslist post draft.
- Facebook/Nextdoor post draft.
- Directory submission description.
- 5 manual outreach tasks.
- 5 agent-executable marketing_tasks rows.

Acceptance criteria:

- One click creates a campaign plan linked to a site/offer.
- Generated tasks go into marketing_tasks.
- Generated copy is reviewable before publishing/sending.
- Nothing mass-sends without explicit approval.

### Phase 4 — Public landing path cleanup

Improve andertongroup.com so traffic converts better.

Requirements:

1. Add a dedicated contractor landing page:
   - /contractor-websites or /websites-for-contractors
2. Use the fresh contractor sites as proof cards.
3. Show pricing clearly.
4. CTA to /start with source parameters:
   - /start?source=contractor-campaign&offer=starter-site
5. Ensure /start passes source and source_offer into /api/leads.
6. Replace emoji service icons in /start with SVG/lucide icons later for polish.
7. Fix stale worker-bee.app references in anderton-associates sitemap/robots/footer.

Acceptance criteria:

- Landing page loads at andertongroup.com/contractor-websites.
- Form submissions appear in manage-worker-bee /leads.
- Lead source and offer are preserved.
- Confirmation email points back to andertongroup.com/start?submitted=1.

### Phase 5 — Lead follow-up automation

When a lead arrives:

1. Add to leads table.
2. Add/update contact in contacts table.
3. Send confirmation email.
4. Notify Toby.
5. Create marketing/sales follow-up tasks:
   - follow up within 24 hours
   - inspect current site if provided
   - draft scoped offer
   - create proposal if qualified
6. Show lead status and next action in /marketing-command.

Acceptance criteria:

- A new lead creates at least one actionable task.
- Lead follow-up tasks are visible in the dashboard.
- Status transitions are easy: new → contacted → scoped → won/lost.

### Phase 6 — ROI and pipeline tracking

Add lightweight metrics:

- campaign_id
- offer_id
- source channel
- number of tasks created
- number of posts/submissions completed
- leads generated
- won revenue
- expected pipeline value

Acceptance criteria:

- Each campaign has a clear “money result.”
- The dashboard shows which offer/channel is worth repeating.

## 9. Data Model Additions

Prefer additive tables. Do not break existing leads/contacts/campaigns/marketing_tasks.

### marketing_offers

Fields:

- id uuid primary key
- name text
- slug text unique
- lane text
- price_min integer
- price_max integer
- recurring_price_min integer nullable
- recurring_price_max integer nullable
- description text
- landing_path text
- status text: draft | active | paused | retired
- created_at timestamptz
- updated_at timestamptz

Seed offers:

- starter-contractor-site
- starter-plus-portal
- website-refresh
- free-10x-audit
- medical-authority-site
- lms-white-label
- worker-bee-white-label-os

### marketing_site_inventory

Fields:

- id uuid primary key
- site_id uuid nullable references sites(id)
- name text
- repo_path text
- live_url text nullable
- category text
- lane text
- proof_status text
- marketing_status text
- offer_id uuid nullable references marketing_offers(id)
- notes text
- created_at timestamptz
- updated_at timestamptz

### marketing_actions

Optional, if marketing_tasks becomes too overloaded.

Fields:

- id uuid primary key
- campaign_id uuid nullable
- lead_id uuid nullable
- site_inventory_id uuid nullable
- channel text
- action_type text
- status text: todo | doing | review | done | skipped
- priority integer
- due_at timestamptz nullable
- assigned_agent text nullable
- title text
- body text
- result_url text nullable
- result_notes text nullable
- created_at timestamptz
- updated_at timestamptz

Recommendation: initially use existing marketing_tasks to avoid premature complexity, then add marketing_actions only if task metadata becomes painful.

## 10. UX Requirements

### /marketing-command page

Desktop layout:

- Top KPI row:
  - new leads
  - active campaigns
  - today’s tasks
  - pipeline value
  - won revenue
- Left column: revenue lanes and active offer cards.
- Middle column: today’s prioritized actions.
- Right column: leads needing follow-up and proof-site library.

Mobile layout:

- KPI cards stacked.
- Today’s actions first.
- Leads second.
- Offers/proof library below.

Design style:

- Match current manage-worker-bee dark dashboard aesthetic.
- Use lucide icons, not emojis, for new UI.
- Make all clickable cards/buttons use cursor-pointer and 150-300ms hover transitions.
- Keep text concise and action-oriented.

## 11. Marketing Campaign Plan — First 14 Days

### Week 1: Contractor website proof + direct outreach

Day 1:

- Finalize contractor landing page.
- Pick 8 best proof sites from the June 6-7 batch.
- Create offer: Starter Site $1,999.
- Create offer: Starter + Portal $2,498.

Day 2:

- Generate 50 local contractor prospects in Idaho / Magic Valley / Boise / Coeur d’Alene.
- Prioritize businesses with weak/no websites.
- Create manual review tasks.

Day 3:

- Send 10 highly personalized emails.
- Post one Craigslist service listing.
- Create one Facebook/Nextdoor-ready post draft.

Day 4:

- Follow up with first 10.
- Send next 10.
- Add 5 directory/backlink placements for Anderton & Associates.

Day 5:

- Review responses.
- Update copy based on objections.
- Create one short case-study page from a proof site.

Day 6-7:

- Light weekend posting and follow-ups only.
- Prepare next week's prospect list.

### Week 2: Repeat with better niche targeting

- Segment by vertical: plumbers/electricians/HVAC first.
- Generate vertical-specific landing sections and email copy.
- Track conversion by niche.
- Double down on the niche that gets replies.

## 12. Success Metrics

### 14-day targets

- 1 dedicated contractor landing page live.
- 50 qualified prospects entered or task-created.
- 30 personalized outbound touches sent.
- 5 conversations started.
- 2 scoped opportunities.
- 1 paid starter build closed or scheduled.

### 30-day targets

- 150 qualified prospects.
- 100 outbound touches.
- 15 conversations.
- 5 scoped opportunities.
- 2-3 paid builds.
- At least one recurring maintenance/SEO plan attached.

## 13. Non-Goals For First Version

- No fully automated mass-email blast without review.
- No paid ads until the landing page and follow-up flow convert organically.
- No complex CRM replacement; use existing leads/contacts/tasks first.
- No public login for clients inside manage.worker-bee.app yet.
- No deleting or restructuring vault/blueprint storage.

## 14. Risks

1. Too many sites, not enough focus.
   - Mitigation: start with one lane: contractor websites.

2. Demos look like fake/spec work if not positioned correctly.
   - Mitigation: label proof as “sample builds,” “demo builds,” or “recent builds” depending on truth status.

3. Outreach becomes spammy.
   - Mitigation: personalize, low volume, manual review, value-first audit angle.

4. Existing campaign systems overlap.
   - Mitigation: /marketing-command is an orchestration layer, not a fourth campaign database.

5. Public/internal boundary is blurry.
   - Mitigation: andertongroup.com stays public. manage.worker-bee.app stays internal/admin unless explicitly packaged as White-Label OS.

## 15. Open Questions

1. Should the first campaign sell as Anderton & Associates or Worker Bee?
   - Recommendation: sell as Anderton & Associates; mention Worker Bee as the internal system that makes delivery fast.

2. Are the June 6-7 contractor sites intended as live client sites, demo/spec builds, or acquisition targets?
   - The marketing copy must truthfully distinguish these.

3. What is the preferred first geographic market?
   - Recommendation: Idaho first: Twin Falls, Boise/Meridian, Coeur d’Alene, Sandpoint, Idaho Falls/Rexburg.

4. Should phone/SMS follow-up be included in v1?
   - Recommendation: create tasks for SMS/call, but do not automate sending yet.

5. Should manage.worker-bee.app remain open/no-auth?
   - For internal use over obscure/admin URL it may be acceptable short-term, but public marketing should not send prospects there except /plan/evaluate style public flows.

## 16. Implementation Plan Stub

Next file should be an implementation plan with exact tasks.

Recommended next plan:

/Users/drive/manage-worker-bee/docs/plans/2026-06-07-marketing-command-implementation.md

Task groups:

1. Add marketing_offers and marketing_site_inventory migration.
2. Add seed script or API route to import /Users/drive website inventory.
3. Build /marketing-command route.
4. Add contractor campaign generator that writes marketing_tasks.
5. Add andertongroup.com contractor landing page.
6. Wire /start source/offer tracking into leads.
7. Add lead-created follow-up task creation.
8. Build/test and visually review changed pages.

## 17. Immediate Next Action

Build the /marketing-command page as the internal cockpit, seeded manually with the June 6-7 contractor sites and the Starter Contractor Site offer. Then use that cockpit to run the first 14-day contractor outreach campaign.
