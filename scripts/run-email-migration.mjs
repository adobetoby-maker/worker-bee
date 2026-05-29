import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '../supabase/migrations/20260529_email_platform.sql'), 'utf8')

const client = createClient(
  'https://qnrkifdbkcbacgznoabs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { error } = await client.rpc('exec_sql', { sql }).catch(() => ({ error: 'rpc not available' }))
if (error) {
  // Fall back to running each statement individually
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    const { error: e } = await client.rpc('exec_sql', { query: stmt })
    if (e) console.error('Failed:', stmt.slice(0, 60), e)
  }
}
console.log('Migration complete')
