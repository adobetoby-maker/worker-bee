---
id: seo-meta-tags
name: SEO Meta Tags
domain: seo
description: Write title/description/og tags that earn clicks.
iterations: 5210
iterationGoal: 10000
passRateLast50: 0.94
addedAt: 2025-09-04T00:00:00Z
---

## Description
Per-route meta with unique title under 60 chars, description under 160,
plus og:image when a hero exists.

## Gap analysis
- Title length drifts past 60 chars under 5% of runs.
- Sometimes reuses home page og:image on leaf routes.

## Action items
- [~] Tighten title-length validator
- [ ] og:image inheritance check