# KAIZEN — Manage Worker Bee
Continuous improvement log. Review on every session. Close items when fixed.
Live: manage.worker-bee.app

---

## Open

### HIGH — Stability
- [ ] **Blueprint API endpoint health** — The `/api/blueprints/update` endpoint is used by all tracked projects to push progress. Verify it returns 200 consistently: `curl -s -o /dev/null -w "%{http_code}" -X POST https://manage.worker-bee.app/api/blueprints/update`. Found: 2026-05-24 — last verified unknown date.
- [ ] **Vault AES-256-GCM key rotation** — Confirm the vault encryption key in env vars matches what was used to write existing vault entries. A mismatch silently fails on read. Found: pattern known, last rotation date unknown.

### MEDIUM — Features
- [ ] **Blueprint canvas site list stale** — Projects listed in the canvas may not reflect the full 55-project ecosystem now visible on Drive 2. Audit the Supabase `sites` table for completeness. Found: 2026-05-24 project inventory.
- [ ] **md-vault-graph-refresh cron** — Cron fires every 4h per the TAC session menu. Verify it is still active and `/api/graph` returns valid data: `curl -s https://manage.worker-bee.app/api/graph | head -c 100`. Found: 2026-05-24 — status unknown.

### LOW — Quality
- [ ] **Admin vs Portal auth separation** — Same dual-auth risk as jrs-auto-repair. Audit that `/admin` cookie routes and any Supabase JWT routes don't share session state.

---

## Closed

| Date fixed | Item |
|---|---|
| 2026-05-22 | Pipeline Studio 7-phase wb-build-pipeline skill wired |
| 2026-05-22 | Vault and Blueprint canvas deployed to manage.worker-bee.app |
