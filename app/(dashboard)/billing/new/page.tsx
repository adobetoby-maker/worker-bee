/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase'
import NewInvoiceForm from './NewInvoiceForm'

export const metadata = { title: 'New Invoice — Worker-Bee' }

type SiteOption = { id: string; name: string; url: string }

const db = supabaseAdmin as any

export default async function NewInvoicePage() {
  const { data } = await db
    .from('sites')
    .select('id,name,url')
    .order('name')

  const sites: SiteOption[] = (data ?? []) as SiteOption[]

  return <NewInvoiceForm sites={sites} />
}
