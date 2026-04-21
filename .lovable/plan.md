# Task Planner UI Plan

Add a multi-step task planner that surfaces a live plan card in the chat panel, driven by new `plan_*` WebSocket events.

## 1. WebSocket layer — src/lib/agent-ws.ts
- Add payload types and parsing for: plan_started, plan_ready, plan_progress, plan_log, plan_complete, plan_error.
- Extend subscribeAgentWS callbacks: onPlanStarted, onPlanReady, onPlanProgress, onPlanLog, onPlanComplete, onPlanError.
- Export sendPlan(tabId, goal) → { action: "plan", goal }.
- Export detectPlanIntent(text) — keyword scan: plan, step by step, automate, do all, for each, audit all, go through, workflow, sequence.
- Export shared types: PlanStep, PlanResult.

## 2. New component — src/components/PlanCard.tsx
- Props: goal, state (generating|ready|running|complete|error), steps, currentIndex, logs, summary, errorMsg, onExecute, onCancel, onDismiss.
- States: generating spinner; ready list w/ EXECUTE/CANCEL; running w/ per-step icons + progress bar + log; complete w/ summary + VIEW RESULTS toggle; error banner.
- Uses CSS variables only; JetBrains Mono.

## 3. ChatView integration — src/components/ChatView.tsx
- Add planCard, planLogs, planResults state.
- New useEffect subscribing to plan events keyed on tabId.
- In send(): after memory/login checks, run detectPlanIntent. If matched, push user msg, store planSuggestion, render amber suggestion bar with [CREATE PLAN] [JUST CHAT].
- Render <PlanCard> above install/repair/login cards.

## 4. BrowserQuickCommands — src/components/BrowserQuickCommands.tsx
- Add 🗺 Plan Task quick action with inline goal input.
- New onPlan(goal) prop wired through TabControls to ChatView.

## Behavioral rules
- One active plan card per tab; plan_started replaces existing.
- Persists after plan_complete until dismissed.
- All styling via CSS variables.

## Files NOT touched (locked)
Vault, connections, tools, projects, memory, login, repair, existing styling.
