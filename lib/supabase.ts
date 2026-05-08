import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Proxy defers initialization so build-time placeholder values don't crash
function makeAdmin() {
  return new Proxy({} as ReturnType<typeof createClient>, {
    get(_, prop) {
      const client = createClient(URL, KEY, { auth: { persistSession: false } })
      return (client as unknown as Record<string | symbol, unknown>)[prop]
    },
  })
}

export const supabaseAdmin = makeAdmin()
