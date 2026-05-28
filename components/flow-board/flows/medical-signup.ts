import type { Node, Edge } from '@xyflow/react'
import type { FlowNodeData } from '../FlowNode'

// ─── Path A: medicalspanish.app → Stripe payment link (no userId) ───────────
// ─── Path B: app.languagethreshold.com → Checkout API (with userId) ─────────

export const MEDICAL_SIGNUP_NODES: Node<FlowNodeData>[] = [
  // ── Path A header ─────────────────────────────────────────────────────────
  {
    id: 'a-label',
    type: 'flow',
    position: { x: 60, y: -60 },
    data: {
      label: 'Path A — Marketing site',
      sublabel: 'medicalspanish.app → Stripe link',
      type: 'start',
      rotation: -0.5,
    },
  },
  {
    id: 'a1',
    type: 'flow',
    position: { x: 60, y: 30 },
    data: {
      label: 'medicalspanish.app',
      sublabel: 'Landing page — medical or construction',
      type: 'screen',
      url: 'medicalspanish.app',
      rotation: -1.2,
    },
  },
  {
    id: 'a2',
    type: 'flow',
    position: { x: 60, y: 230 },
    data: {
      label: 'Clicks pricing CTA',
      sublabel: '"Start Learning" or "View Pricing"',
      type: 'action',
      rotation: 0.8,
    },
  },
  {
    id: 'a3',
    type: 'flow',
    position: { x: 60, y: 420 },
    data: {
      label: 'Pricing page',
      sublabel: 'Monthly $19 · Annual $12/mo · Family · Kids',
      type: 'screen',
      url: 'medicalspanish.app/pricing',
      rotation: -0.5,
    },
  },
  {
    id: 'a4',
    type: 'flow',
    position: { x: 60, y: 620 },
    data: {
      label: 'Selects plan, clicks "Start free trial"',
      type: 'action',
      rotation: 1.0,
    },
  },
  {
    id: 'a5',
    type: 'flow',
    position: { x: 60, y: 810 },
    data: {
      label: 'Stripe Payment Link',
      sublabel: 'buy.stripe.com/…',
      type: 'external',
      url: 'buy.stripe.com/...',
      rotation: -0.8,
    },
  },
  {
    id: 'a6',
    type: 'flow',
    position: { x: 60, y: 1000 },
    data: {
      label: 'Enters card — trial starts',
      sublabel: '7-day free trial',
      type: 'action',
      rotation: 0.6,
    },
  },
  {
    id: 'a-gap',
    type: 'flow',
    position: { x: 60, y: 1185 },
    data: {
      label: '⚠ No userId captured',
      sublabel: 'Stripe payment links can\'t pass userId — subscription not auto-linked to Supabase account',
      type: 'gap',
      note: 'Fix: add ?client_reference_id to link URL after user logs in, OR redirect to app first',
      rotation: -1.5,
    },
  },
  {
    id: 'a7',
    type: 'flow',
    position: { x: 60, y: 1440 },
    data: {
      label: 'Success redirect',
      sublabel: 'Configured in Stripe dashboard',
      type: 'external',
      url: 'app.languagethreshold.com/subscribe/success',
      rotation: 0.4,
    },
  },
  {
    id: 'a8',
    type: 'flow',
    position: { x: 60, y: 1630 },
    data: {
      label: 'Has account?',
      sublabel: 'Already signed in at app.languagethreshold.com?',
      type: 'decision',
      rotation: -0.8,
    },
  },
  {
    id: 'a9-yes',
    type: 'flow',
    position: { x: -200, y: 1830 },
    data: {
      label: 'Subscribe/success page',
      sublabel: '"You\'re in!" — but sub may not be linked to account',
      type: 'screen',
      url: '/subscribe/success',
      rotation: -1.2,
      note: 'Subscription status updates via webhook if userId in metadata',
    },
  },
  {
    id: 'a9-no',
    type: 'flow',
    position: { x: 300, y: 1830 },
    data: {
      label: 'Sign up / sign in',
      sublabel: 'User must create account manually — sub not linked',
      type: 'action',
      rotation: 1.0,
    },
  },

  // ── Separator ──────────────────────────────────────────────────────────────
  // ── Path B header ─────────────────────────────────────────────────────────
  {
    id: 'b-label',
    type: 'flow',
    position: { x: 680, y: -60 },
    data: {
      label: 'Path B — App direct',
      sublabel: 'app.languagethreshold.com → Checkout API',
      type: 'start',
      rotation: 0.5,
    },
  },
  {
    id: 'b1',
    type: 'flow',
    position: { x: 680, y: 30 },
    data: {
      label: 'app.languagethreshold.com',
      sublabel: 'Free Missionary Spanish access',
      type: 'screen',
      url: 'app.languagethreshold.com',
      rotation: 1.1,
    },
  },
  {
    id: 'b2',
    type: 'flow',
    position: { x: 680, y: 230 },
    data: {
      label: '"Save progress" banner',
      sublabel: 'Shows for unauthenticated users in sidebar',
      type: 'action',
      rotation: -0.6,
    },
  },
  {
    id: 'b3',
    type: 'flow',
    position: { x: 680, y: 420 },
    data: {
      label: 'Auth modal opens',
      sublabel: 'Sign up with email / Google / Apple',
      type: 'screen',
      rotation: 1.2,
    },
  },
  {
    id: 'b4',
    type: 'flow',
    position: { x: 680, y: 620 },
    data: {
      label: 'Account created',
      sublabel: 'userId assigned in Supabase',
      type: 'external',
      note: 'supabase.auth.signUp()',
      rotation: -0.4,
    },
  },
  {
    id: 'b5',
    type: 'flow',
    position: { x: 680, y: 810 },
    data: {
      label: 'Clicks Upgrade / Pricing',
      sublabel: 'From Save Progress or sidebar CTA',
      type: 'action',
      rotation: 0.9,
    },
  },
  {
    id: 'b6',
    type: 'flow',
    position: { x: 680, y: 1000 },
    data: {
      label: '/pricing page',
      sublabel: 'Monthly · Annual · Family · Kids',
      type: 'screen',
      url: 'app.languagethreshold.com/pricing',
      rotation: -1.0,
    },
  },
  {
    id: 'b7',
    type: 'flow',
    position: { x: 680, y: 1185 },
    data: {
      label: '/api/create-checkout',
      sublabel: 'Stripe session with userId + 7-day trial',
      type: 'external',
      note: 'userId passed via metadata + client_reference_id ✓',
      rotation: 0.7,
    },
  },
  {
    id: 'b8',
    type: 'flow',
    position: { x: 680, y: 1380 },
    data: {
      label: 'Stripe checkout',
      sublabel: 'stripe.com/pay/… · card entry · 7-day trial',
      type: 'external',
      rotation: -0.5,
    },
  },
  {
    id: 'b9',
    type: 'flow',
    position: { x: 680, y: 1570 },
    data: {
      label: 'Webhook fires',
      sublabel: 'checkout.session.completed → subscription.created',
      type: 'external',
      note: 'Updates profiles.data: subscription_status, subscription_id, period_end',
      rotation: 1.1,
    },
  },
  {
    id: 'b10',
    type: 'flow',
    position: { x: 680, y: 1780 },
    data: {
      label: '/subscribe/success',
      sublabel: '"You\'re in!" — full access activated',
      type: 'success',
      url: 'app.languagethreshold.com/subscribe/success',
      note: 'Links to /family-setup + JL 50% off cross-sell',
      rotation: -0.6,
    },
  },
  {
    id: 'b11',
    type: 'flow',
    position: { x: 680, y: 1990 },
    data: {
      label: 'Full app access',
      sublabel: '660+ lessons · all modules · AI tutor',
      type: 'success',
      url: 'app.languagethreshold.com',
      rotation: 0.8,
    },
  },
]

function makeEdge(source: string, target: string, label?: string): Edge {
  return {
    id: `${source}→${target}`,
    source,
    target,
    type: 'flow-string',
    label,
    labelStyle: { fontFamily: 'monospace', fontSize: 9, fill: '#78716c' },
    labelBgStyle: { fill: '#faf6ee', fillOpacity: 0.85 },
  }
}

export const MEDICAL_SIGNUP_EDGES: Edge[] = [
  // Path A
  makeEdge('a-label', 'a1'),
  makeEdge('a1', 'a2'),
  makeEdge('a2', 'a3'),
  makeEdge('a3', 'a4'),
  makeEdge('a4', 'a5'),
  makeEdge('a5', 'a6'),
  makeEdge('a6', 'a-gap'),
  makeEdge('a-gap', 'a7', 'Stripe success URL'),
  makeEdge('a7', 'a8'),
  makeEdge('a8', 'a9-yes', 'yes'),
  makeEdge('a8', 'a9-no', 'no'),
  // Path B
  makeEdge('b-label', 'b1'),
  makeEdge('b1', 'b2'),
  makeEdge('b2', 'b3'),
  makeEdge('b3', 'b4'),
  makeEdge('b4', 'b5'),
  makeEdge('b5', 'b6'),
  makeEdge('b6', 'b7', 'start trial'),
  makeEdge('b7', 'b8'),
  makeEdge('b8', 'b9', 'payment success'),
  makeEdge('b9', 'b10'),
  makeEdge('b10', 'b11', 'continue'),
]
