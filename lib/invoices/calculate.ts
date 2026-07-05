// Invoice calculation engine — adapted from worker-bee module invoice-calc-engine
// All monetary values are in integer cents to avoid floating-point drift.

export interface InvoiceLine {
  quantity: number
  unit_price_cents: number
  total_cents: number
}

/**
 * Calculate the total for a single line item (quantity × unit price).
 * Returns an integer number of cents.
 */
export function calcLineTotal(quantity: number, unit_price_cents: number): number {
  return Math.round(quantity * unit_price_cents)
}

/**
 * Sum all line item totals. Returns cents.
 */
export function calcSubtotal(items: Pick<InvoiceLine, 'total_cents'>[]): number {
  return items.reduce((sum, item) => sum + item.total_cents, 0)
}

/**
 * Calculate tax given subtotal in cents and a percentage rate (e.g. 8.5 for 8.5%).
 * Returns cents, rounded to nearest cent.
 */
export function calcTax(subtotalCents: number, taxRatePct: number): number {
  return Math.round(subtotalCents * taxRatePct / 100)
}

/**
 * Sum subtotal + tax to get invoice total. Returns cents.
 */
export function calcTotal(subtotalCents: number, taxCents: number): number {
  return subtotalCents + taxCents
}

/**
 * Recalculate a full invoice snapshot from items + tax rate.
 * Returns { subtotal_cents, tax_rate_pct, total_cents } ready to write to DB.
 */
export function calcInvoiceTotals(
  items: Pick<InvoiceLine, 'total_cents'>[],
  taxRatePct: number
): { subtotal_cents: number; tax_rate_pct: number; total_cents: number } {
  const subtotal_cents = calcSubtotal(items)
  const taxCents = calcTax(subtotal_cents, taxRatePct)
  return {
    subtotal_cents,
    tax_rate_pct: taxRatePct,
    total_cents: calcTotal(subtotal_cents, taxCents),
  }
}
