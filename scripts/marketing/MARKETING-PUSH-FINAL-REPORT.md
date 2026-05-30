# Marketing Push — Final Report
**Date: 2026-05-30 | Version: 1.0 | Owner: Drive Workspace**

---

## 1. TOP 10 CHANNELS — Ranked by Impact / Effort

| Rank | Channel | Playwright Status | DA Est. | Cost | Time/Sub | Best Fit Sites | Dofollow? |
|---|---|---|---|---|---|---|---|
| 1 | Google Business Profile | LIVE (auth wall) | 98 | Free | 15 min | jrs, silver-creek | N/A (local pack) |
| 2 | Bing Places for Business | LIVE (auth wall) | 94 | Free | 10 min | jrs, silver-creek | N/A (local pack) |
| 3 | PRLog Press Release | PASS (form live) | 80 | Free (1/day) | 20 min | all SaaS, climbing | Yes (syndicated) |
| 4 | Quora | PASS (form live) | 93 | Free | 15 min/answer | medical, climbing, SaaS | Nofollow (ranks on Google) |
| 5 | Reddit | LIVE (auth wall) | 91 | Free | 20 min/post | climbing, medical, SaaS | Nofollow (traffic + brand) |
| 6 | Product Hunt | PASS (form live) | 91 | Free | 45 min setup | medicalspanish, language-lens, manage-worker-bee | Nofollow |
| 7 | Betalist | PASS (form live) | 68 | Free | 10 min | SaaS with waitlist/beta | Yes |
| 8 | Indie Hackers | LIVE (auth wall) | 78 | Free | 20 min | SaaS, bootstrapped tools | Dofollow (profile) |
| 9 | Hotfrog Directory | PASS (form live) | 52 | Free | 10 min | jrs, silver-creek, tobyandertonmd | Yes |
| 10 | Manta Directory | LIVE (account flow) | 55 | Free | 15 min | jrs, silver-creek | Yes |

**Playwright Test Notes:**
- PRLog: Old URL `/post-press-release.html` is dead — confirmed live at `/submit-free-press-release.html`
- Manta: `/add_business` is 404 — use account creation flow via `manta.com` directly
- EZLocal: `/free-listing` redirects to search results — low priority, contact required
- Hotfrog: Original `.aspx` URL dead — confirmed live at `/add`
- Bing Places: `bingplaces.com` redirects to `bing.com/forbusiness/` — Microsoft account required

---

## 2. SITE-TO-CHANNEL MATRIX

| Site | GBP/Bing | PRLog | Reddit | Quora | Product Hunt | Betalist | Indie Hackers | Directories | Pinterest | HARO/Qwoted |
|---|---|---|---|---|---|---|---|---|---|---|
| jrs-auto-repair | YES (primary) | YES (local news angle) | r/twinfalls, r/mechanics | Car repair questions | No | No | No | YES (Hotfrog, Manta, Yelp) | No | No |
| silver-creek-logistics | YES (primary) | YES (logistics angle) | r/logistics, r/trucking | Freight/dispatch Q&A | No | No | No | YES | No | No |
| climb-france | No | YES (route releases) | r/climbingr/bouldering | Climbing France Q&A | No | No | No | Travel/outdoor dirs | YES | Outdoor/travel HARO |
| climb-brasil | No | YES | r/climbing, r/brasil | Brazil climbing Q&A | No | No | No | Travel dirs | YES | No |
| climb-utah | No | YES | r/climbing, r/utah | Utah climbing Q&A | No | No | No | Utah tourism dirs | YES | No |
| medicalspanish.app | No | YES (healthcare angle) | r/nursing, r/medicine | Medical Spanish Q&A | YES (launch) | YES | YES | Healthcare dirs | No | YES (nursing/healthcare) |
| language-lens-elite | No | YES | r/languagelearning | Language learning Q&A | YES | YES | YES | EdTech dirs | No | No |
| manage-worker-bee | No | YES | r/webdev, r/freelance | Freelance tools Q&A | YES | YES | YES | SaaS dirs | No | No |
| orthobiologic-pathways | No | YES (medical angle) | r/medicine, r/orthopedics | Orthobiologic Q&A | No | No | No | Medical dirs | No | YES (medical) |
| tobyandertonmd | No | YES | r/medicine | Regenerative med Q&A | No | No | No | Doctor dirs (Healthgrades, Vitals) | No | YES (medical) |

**Priority Tiers:**
- Tier 1 (do first): GBP for jrs/silver-creek + PRLog for SaaS + Reddit for climbing
- Tier 2 (week 2): Quora answers, Product Hunt launches, Betalist submissions
- Tier 3 (ongoing): Directories, HARO, Indie Hackers community building

---

## 3. WEEK 1 PLAYBOOK — First 3 Highest-Impact Actions

### Action 1: Google Business Profile + Bing Places (Days 1–2)
**Sites:** jrs-auto-repair, silver-creek-logistics
**Effort:** 45 minutes total
**Expected lift:** 20–40% increase in local pack visibility within 2 weeks

Steps:
1. Go to `business.google.com` — create/claim listing for jrs-auto-repair (Twin Falls, ID)
2. Fill: business name, address, phone, hours, category (Auto Repair), website URL
3. Request phone verification (faster than postcard)
4. Repeat for silver-creek-logistics (category: Freight/Logistics)
5. Go to `bing.com/forbusiness/` — import from Google Business Profile (one click)
6. Also submit to Apple Business Connect (`businessconnect.apple.com`) — covers Apple Maps

**Backlink type:** Not a traditional backlink, but feeds Google Maps, Local Pack, and AI Overviews directly.

---

### Action 2: PRLog Press Releases for SaaS Sites (Days 2–3)
**Sites:** medicalspanish.app, language-lens-elite, manage-worker-bee
**Effort:** 20 minutes per release
**Expected lift:** 3–8 syndicated backlinks per release (DA 40–75), indexed by Google in 48–72 hours

Submit URL: `https://www.prlog.org/submit-free-press-release.html`

Template per site:
```
Headline: [Product Name] Launches [Feature] for [Target Audience]

Body (300–500 words):
- Lead paragraph: who, what, when, where
- Problem being solved (2 sentences)
- Product description with primary keyword in first 100 words
- 1 quote from "the team"
- Call to action with URL
- About section with homepage link (this is the backlink)

Category: Technology > Software
Distribution: Free (national + industry)
```

Run script: `node /Users/drive/manage-worker-bee/scripts/marketing/submit-prlog.mjs`
Note: Script has pre-filled templates — review and customize before submitting.

---

### Action 3: Reddit Value Posts for Climbing Sites (Days 3–5)
**Sites:** climb-france, climb-brasil, climb-utah
**Effort:** 20 minutes per post, manual only
**Expected lift:** 100–500 referral visits per well-performing post, brand mentions, some dofollow links from comments

Subreddits:
- `r/climbing` (2.1M members) — general climbing content
- `r/bouldering` (300K members) — bouldering specific
- `r/france` + `r/travel` — for climb-france
- `r/brazil` + `r/latinamerica` — for climb-brasil
- `r/utah` + `r/SaltLakeCity` — for climb-utah

Post format (value-first, link in body or comments):
```
Title: "Just got back from [region] — here's what I learned about [specific topic]"

Body:
- Genuine trip report or route beta (200+ words)
- Specific, accurate information (grades, access, conditions)
- Mention the site once, contextually: "I wrote a more detailed guide at [URL] if helpful"
- Never lead with the link
- Respond to every comment within 24 hours
```

Use helper: `node /Users/drive/manage-worker-bee/scripts/marketing/reddit-post-helper.mjs`

---

## 4. AUTOMATION STATUS

### Fully Automatable
| Task | Script | Cadence |
|---|---|---|
| PRLog submission | `submit-prlog.mjs` | 1x/week per SaaS site |
| Channel health checks | `test-channels.mjs` | Monthly (confirm URLs still live) |
| Directory submissions | `submit-directories.mjs` | One-time, then annual refresh |
| Dashboard data updates | `channel-report.json` + dashboard | After each submission |

### Semi-Automatable (script drafts, human submits)
| Task | Script | Notes |
|---|---|---|
| Quora answer drafts | `quora-helper.mjs` | Script finds questions, drafts answers — human pastes and submits |
| Reddit post drafts | `reddit-post-helper.mjs` | Script templates per subreddit — human reviews tone before posting |
| Pinterest pin creation | Not yet built | Needs image generation + Canva/Buffer API integration |

### Manual Only (cannot automate safely)
| Task | Why Manual | Time Estimate |
|---|---|---|
| Reddit actual posting | Bans for bot-like behavior; needs genuine community presence | 20 min/post |
| HARO/Qwoted pitching | Responses require live journalist queries + credentialed answers | 15 min/pitch |
| Product Hunt launch day | Community upvoting requires active participation | 2–4 hours on launch day |
| Indie Hackers posts | Community-first; automation detected and mocked | 20 min/post |
| GBP verification | Phone/postcard verification by Google | 5 min (plus wait) |

---

## 5. EXPECTED RESULTS — 30-Day Traffic Lift Estimates

### Local Business Sites (jrs-auto-repair, silver-creek-logistics)
| Action | Expected Result | Timeline |
|---|---|---|
| GBP + Bing Places live | 20–40% local pack visibility increase | 2–3 weeks post-verification |
| Hotfrog + Manta + Yelp citations | 5–15 consistent NAP citations (trust signal) | Indexed in 1–4 weeks |
| Craigslist (Twin Falls — free) | Direct local inquiries (not SEO) | Immediate, 7-day lifespan |
| **Total 30-day lift** | +30–50 local organic visits/month, map pack entry | — |

### Climbing Sites (climb-france, climb-brasil, climb-utah)
| Action | Expected Result | Timeline |
|---|---|---|
| 3 Reddit posts (1 per site) | 150–800 referral visits if posts gain traction | 1–7 days |
| 2 PRLog releases per site | 6–16 syndicated backlinks total | 3–7 days |
| Pinterest boards (10 pins) | 50–200 monthly impressions per pin (compounding) | 30–90 days |
| Hotfrog + travel directories | 5–10 DA 40–60 backlinks | 2–4 weeks |
| **Total 30-day lift** | +200–1,000 referral visits, DR +2–4 per site | — |

### SaaS Sites (medicalspanish, language-lens, manage-worker-bee)
| Action | Expected Result | Timeline |
|---|---|---|
| Product Hunt launch (1 site) | 200–2,000 visits on launch day, DA 91 backlink | Launch day |
| Betalist submission | 50–200 signups/waitlist entries if accepted | 1–4 weeks |
| PRLog press release (1/site) | 3–8 backlinks, 50–200 search-driven visits | 1–2 weeks |
| Quora answers (5/site) | 30–300 monthly organic clicks (compounds over time) | 30–180 days |
| HARO/Qwoted (2 pitches/month) | 1–3 DR 80+ backlinks/month if placed | 2–6 weeks |
| Indie Hackers post | 100–500 referral visits if engaged community | 1–3 days |
| **Total 30-day lift** | +500–3,000 visits (launch site), +100–500 others | — |

### Medical/Specialist (orthobiologicpathways, tobyandertonmd)
| Action | Expected Result | Timeline |
|---|---|---|
| Healthgrades + Vitals + WebMD listings | 10–30 local/medical citations | 1–4 weeks |
| HARO healthcare pitches | 1–2 DR 70–90 backlinks if placed | 2–6 weeks |
| PRLog medical release | 4–10 syndicated backlinks | 3–7 days |
| **Total 30-day lift** | +50–200 organic visits, trust signal for E-E-A-T | — |

---

## 6. LOGGING TEMPLATE

All submissions tracked in dashboard at `/marketing-push` in manage-worker-bee.
Backup log format:

```
Date | Site | Channel | URL Submitted To | Backlink Y/N | DR of Source | Notes
2026-05-30 | jrs-auto-repair | GBP | business.google.com | Local pack | 98 | Pending phone verify
2026-05-30 | medicalspanish | PRLog | prlog.org/xxxx | Yes | 80 | Syndicated to 40 outlets
```

---

## 7. 8-WEEK DECISION RULE

After 8 weeks, run this evaluation:
- Channel produced 0 backlinks AND 0 referral traffic → drop it
- Channel produced 1+ backlinks OR 100+ referral visits → double submission rate
- Channel produced DR 70+ backlink → prioritize for all remaining sites immediately

Run channel report: `node /Users/drive/manage-worker-bee/scripts/marketing/channel-report.json`

---

*Report generated: 2026-05-30*
*Dashboard: /Users/drive/manage-worker-bee/app/(dashboard)/marketing-push/page.tsx*
*Scripts: /Users/drive/manage-worker-bee/scripts/marketing/*
