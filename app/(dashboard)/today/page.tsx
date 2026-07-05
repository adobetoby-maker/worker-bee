// Built by ATLAS — 2026-07-05
// /today — reachable alias for the Today console.
// app/page.tsx (public landing) shadows the (dashboard) group at '/', so the
// replaced dashboard home (app/(dashboard)/page.tsx) is unreachable at the root.
// This route exposes the same page behind the admin cookie. Root cleanup is Phase 5.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Today — Worker-Bee' }
export { default } from '../page'
