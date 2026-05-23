# Worker-Bee Build Pipeline — Overview

The pipeline converts a client blueprint into a deployed, visually-approved website.
Each phase has its own guide (01–04). Follow them in order.

## Flow

```
Client prompt
  → /plan wizard (7 steps)
  → Blueprint generated (AI)
  → Client reviews corkboard
  → Client confirms
  → Build trigger fires
  → 01-research: interpret intent, gather assets
  → 02-scaffold: scaffold Next.js project from blueprint nodes
  → 03-visual-loop: 10 iterations — build → screenshot → score → fix
  → 04-deploy: push to Vercel, assign subdomain, disable protection
  → Done — client gets live URL
```

## Ground Rules

- **One phase at a time.** Complete and verify before moving on.
- **Score gate:** visual loop requires ≥ 85/100 before deploy. Stop at 10 iterations regardless.
- **Non-destructive:** never delete files; fix forward.
- **Blueprint is truth:** every node becomes a page, section, or component. Do not invent pages that aren't in the blueprint.
- **Autonomous:** do not ask permission for reversible actions (file edits, npm installs, dev server start). Ask only before: deploy, rm -rf, force push.

## Build Job State

Each build is tracked in Supabase Storage under `build-logs/{jobId}.json`:

```json
{
  "jobId": "...",
  "submissionId": "...",
  "siteId": "...",
  "status": "queued | building | iterating | deploying | done | error",
  "iteration": 3,
  "maxIterations": 10,
  "scores": [72, 78, 85],
  "currentScore": 85,
  "deployUrl": "https://...",
  "phases": { "research": "done", "scaffold": "done", "visual-loop": "running", "deploy": "pending" },
  "log": ["2026-05-18T... Phase scaffold complete", "..."],
  "updatedAt": "2026-05-18T..."
}
```

## Phase Guides

| File | Phase | Purpose |
|------|-------|---------|
| `01-research.md` | Research | Interpret blueprint, write project brief |
| `02-scaffold.md` | Scaffold | Create Next.js project skeleton from blueprint |
| `03-visual-loop.md` | Visual Loop | 10-iteration screenshot → score → fix cycle |
| `04-deploy.md` | Deploy | Vercel deploy, subdomain, cleanup |
