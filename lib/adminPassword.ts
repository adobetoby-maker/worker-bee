// Built by ATLAS — 2026-07-05
// Admin password verification with a Supabase-Storage-backed override.
//
// There is no user table. Auth today is a single shared ADMIN_PASSWORD env
// var. To let the operator rotate the password WITHOUT a redeploy or DB
// migration, an scrypt hash can be stored as JSON in the existing private
// `blueprints` bucket (same bucket/pattern as lib/blueprintStore.ts) at
// `system/admin-auth.json`:
//
//   { "scrypt_hash": "<hex>", "salt": "<hex>", "updated_at": "<ISO>" }
//
// Resolution order in verifyAdminPassword:
//   1. Storage JSON exists → scrypt-verify against it (env var is IGNORED).
//   2. No storage JSON → constant-time compare against ADMIN_PASSWORD env.
//
// setAdminPassword writes/overwrites the storage JSON (called by
// /api/auth/reset-confirm after a valid HMAC reset token).

import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { supabaseAdmin } from '@/lib/supabase'

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const BUCKET = 'blueprints'
const KEY = 'system/admin-auth.json'
const KEYLEN = 64

interface AdminAuthRecord {
  scrypt_hash: string
  salt: string
  updated_at: string
}

async function readAuthRecord(): Promise<AdminAuthRecord | null> {
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(KEY)
    if (error || !data) return null
    const parsed = JSON.parse(await data.text()) as Partial<AdminAuthRecord>
    if (
      typeof parsed.scrypt_hash !== 'string' ||
      typeof parsed.salt !== 'string' ||
      !/^[0-9a-f]+$/i.test(parsed.scrypt_hash) ||
      !/^[0-9a-f]+$/i.test(parsed.salt)
    ) {
      return null
    }
    return parsed as AdminAuthRecord
  } catch {
    // Malformed JSON / storage outage → fall back to env password rather than
    // locking the operator out entirely.
    return null
  }
}

/** Constant-time compare of two strings of possibly different lengths. */
function safeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Verify a candidate admin password.
 * Storage override wins when present; otherwise falls back to ADMIN_PASSWORD.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password || typeof password !== 'string') return false

  const record = await readAuthRecord()
  if (record) {
    const expected = Buffer.from(record.scrypt_hash, 'hex')
    if (expected.length === 0) return false
    const salt = Buffer.from(record.salt, 'hex')
    const actual = await scrypt(password, salt, expected.length)
    return timingSafeEqual(actual, expected)
  }

  const envPassword = process.env.ADMIN_PASSWORD ?? ''
  if (!envPassword) return false
  return safeStringEqual(password, envPassword)
}

/** Write a new scrypt password hash to storage (becomes the active password). */
export async function setAdminPassword(password: string): Promise<void> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, KEYLEN)
  const record: AdminAuthRecord = {
    scrypt_hash: hash.toString('hex'),
    salt: salt.toString('hex'),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(KEY, JSON.stringify(record), {
      contentType: 'application/json',
      upsert: true,
    })
  if (error) throw new Error(`Admin password save failed: ${error.message}`)
}
