# Verify — feature/key-rotation (2026-07-05)

Security hardening: key rotation + endpoint auth + rate limiting. No visual
surface changed — the only .tsx edits remove a hardcoded API key from fetch
headers on four admin dashboard pages (auth now rides the wb_admin_session
cookie, verified below) and swap a key literal inside generated mission text
in three build components. Rendering paths untouched.

| Spec item            | Observed                                                                 | Result |
|---|---|---|
| Layout / spacing     | Waiver — auth-only change, no layout/DOM/style edits in any component    | PASS |
| Colors / contrast    | Waiver — no color or style values touched                                | PASS |
| Typography           | Waiver — no type changes                                                 | PASS |
| Mobile (375px)       | Waiver — no responsive surface touched                                   | PASS |
| Animations / motion  | Waiver — none touched                                                    | PASS |
| Behavior: wb-run     | local next start :3458 — GET/POST no key 401; GET with WB_RUN_API_KEY 200; no ACAO header | PASS |
| Behavior: marketing  | no key 401; old rotated key 401; new MARKETING_API_KEY 200; admin cookie (no key) 200 — dashboard pages keep working | PASS |
| Behavior: build-status/list | anonymous 401 (middleware AND new in-route check); admin cookie 200 | PASS |
| Behavior: rate limit | POST /api/site-audit 11 rapid calls → 10× 200 then 429                   | PASS |
| Behavior: matcher    | /sites/x.txt → 307 /login (extension bypass closed); /globe.svg still 200 | PASS |
| Gates                | npx tsc --noEmit = 26 errors (exact pre-existing baseline, zero new); npm run build passes | PASS |
