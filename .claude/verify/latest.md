# Verify — feature/auth-middleware (Phase 0 security lockdown)
Date: 2026-07-05 · Mission type: code change (no visual surface touched)
Change: default-deny middleware.ts + edge cookie validator + CRON_SECRET cron guards + migration hygiene

| Spec item | Observed | Result |
|---|---|---|
| tsc --noEmit | 24 errors — byte-identical to clean main baseline; 0 new from this change | PASS |
| npm run build | exit 0, middleware registered in build output | PASS |
| Protected page anon | local `next start`: /sites → 307 /login | PASS |
| Protected API anon | /api/clients → 401 JSON; 200 after real login cookie; tampered cookie rejected | PASS |
| Public funnels anon | /evaluate, /plan → 200; traced funnel APIs reachable | PASS |
| Token portals | /invoice/[token] works; /api/invoice-pdf now requires ?token= or admin cookie | PASS |
| Cron guard | /api/cron/* without bearer → 401 (fail-closed); CRON_SECRET set in Vercel prod | PASS |
| Visual change | none — middleware + API + migrations only; no .tsx/.css layout files touched | WAIVED (code-change proof table applies: tsc + curl) |

Post-deploy gate (run against live after promote): manage.worker-bee.app → 200; /sites anon → 307 to /login; /api/clients anon → 401; /evaluate → 200; login flow with ADMIN_PASSWORD → dashboard loads.
Previous visual verify preserved at .claude/verify/history/2026-07-02-invoice-portal.md.
