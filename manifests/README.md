# Skill manifests

Each skill lives at `manifests/skills/<domain>/<id>.skill.md` and follows this shape:

```
---
id: stack-trace-triage
name: Stack-trace Triage
domain: debugging          # debugging | seo | design | backend | frontend | data | devops | writing | other
description: One-line summary that shows up on the cards.
iterations: 8420
iterationGoal: 10000
passRateLast50: 0.98
addedAt: 2025-08-12T00:00:00Z
---

## Description
Longer freeform description (optional). The first paragraph is used if no
`description:` field is set in the frontmatter.

## Gap analysis
- Async stack frames sometimes mis-attributed.
- Bun stack frames missing source maps in 2% of cases.

## Action items
- [ ] Frame-clause flashcards            <!-- todo -->
- [~] Add async cause-chain drills       <!-- in_progress -->
- [x] Wire source-map fallback           <!-- done -->
```

Practice runs are JSON, one file per run, written to
`manifests/practice/runs/*.json`:

```json
{
  "id": "run-2025-11-24T12-04-11",
  "skillId": "stack-trace-triage",
  "scenario": "edge-case",
  "passed": true,
  "durationMs": 842,
  "at": "2025-11-24T12:04:11Z"
}
```

The cockpit reads these on every snapshot. The 50 most recent runs per skill
are used to compute the live `passRateLast50`, overriding any value in
frontmatter.