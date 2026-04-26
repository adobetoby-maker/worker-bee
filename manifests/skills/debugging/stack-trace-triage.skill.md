---
id: stack-trace-triage
name: Stack-trace Triage
domain: debugging
description: Read stack traces and isolate the failing frame fast.
iterations: 8420
iterationGoal: 10000
passRateLast50: 0.98
addedAt: 2025-08-12T00:00:00Z
---

## Description
Skim a stack trace, locate the originating frame, and pull the minimum
context needed to reproduce. Optimised for noisy async traces.

## Gap analysis
- Async stack frames sometimes mis-attributed.
- Bun stack frames missing source maps in 2% of cases.

## Action items
- [~] Add async cause-chain drills
- [ ] Source-map fallback for Bun
- [x] Drop noisy node_modules frames