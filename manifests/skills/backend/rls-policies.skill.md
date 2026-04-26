---
id: rls-policies
name: Supabase RLS
domain: backend
description: Author safe row-level security policies with separate roles table.
iterations: 1820
iterationGoal: 10000
passRateLast50: 0.86
addedAt: 2025-10-25T00:00:00Z
---

## Gap analysis
- Forgets has_role helper on new tables ~10% of runs.

## Action items
- [~] Template scaffolder for new tables