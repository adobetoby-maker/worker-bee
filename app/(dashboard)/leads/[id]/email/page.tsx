export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import EmailComposer from './EmailComposer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

export default async function ProspectEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [prospectRes, templatesRes] = await Promise.all([
    db.from('prospects')
      .select('id, business_name, owner_name, email, city, category, demo_url')
      .eq('id', id)
      .single(),
    db.from('email_templates')
      .select('id, name, touch_number, subject_template, plain_text_body, html_body, variables')
      .order('touch_number', { ascending: true, nullsFirst: false }),
  ])

  if (prospectRes.error || !prospectRes.data) notFound()

  const prospect = prospectRes.data
  const templates = templatesRes.data ?? []

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/leads/${id}`}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={14} /> {prospect.business_name}
        </Link>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <span className="text-sm text-white">Email Composer</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Compose Email</h1>
        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
          Select a template, preview with live variables, then open in Gmail to send.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="card rounded-xl p-8 text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            No email templates found. Create templates in the Template Library first.
          </p>
          <Link href="/leads/templates"
            className="inline-flex px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
            Go to Template Library
          </Link>
        </div>
      ) : (
        <EmailComposer prospect={prospect} templates={templates} />
      )}
    </div>
  )
}
