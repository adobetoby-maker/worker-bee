import { redirect } from 'next/navigation'

// /invoices is an alias for /billing — all invoice management lives there
export default function InvoicesRedirect() {
  redirect('/billing')
}
