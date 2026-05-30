/**
 * POST /api/vault/migrate
 * One-time migration: reads old vault blob from vault_storage, decrypts it,
 * and writes each credential as an individual row to the `credentials` table.
 *
 * Body: { masterPassword: string }
 * Returns: { migrated: number, skipped: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { decryptVault } from "@/lib/vaultCrypto";
import { createCredential } from "@/lib/vaultStoreDB";
import type { Credential } from "@/lib/vaultStore";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type VaultData = { version: 1; credentials: Credential[] };

export async function POST(req: NextRequest) {
  const { masterPassword } = await req.json();

  if (!masterPassword) {
    return NextResponse.json({ error: "masterPassword required" }, { status: 400 });
  }

  // Read old blob
  const blobRes = await fetch(
    `${SUPABASE_URL}/rest/v1/vault_storage?id=eq.default&select=data`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const rows = await blobRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ migrated: 0, skipped: 0, note: "No legacy vault found" });
  }

  let vault: VaultData;
  try {
    const plain = await decryptVault(rows[0].data, masterPassword);
    vault = JSON.parse(plain);
  } catch {
    return NextResponse.json({ error: "Incorrect master password" }, { status: 401 });
  }

  // Check which IDs already exist in the new table to avoid duplicates
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/credentials?select=id`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const existing: { id: string }[] = await existingRes.json();
  const existingIds = new Set(existing.map((r) => r.id));

  let migrated = 0;
  let skipped  = 0;

  for (const cred of vault.credentials ?? []) {
    if (existingIds.has(cred.id)) { skipped++; continue; }
    try {
      // createCredential generates a new UUID, so we PATCH id after insert
      const { id: _newId, ...rest } = cred;
      // Insert with the original id by using upsert directly
      const body = {
        id: cred.id,
        title: cred.title,
        category: cred.category,
        site: cred.site,
        project: cred.project,
        username: cred.username,
        host: cred.host,
        port: cred.port,
        db_name: cred.database,
        tags: cred.tags ?? [],
        created_at: cred.createdAt,
        updated_at: cred.updatedAt,
      };

      // Encrypt secrets
      const { encryptVault } = await import("@/lib/vaultCrypto");
      if (cred.password) (body as Record<string, unknown>).password_enc = JSON.stringify(await encryptVault(cred.password, masterPassword));
      if (cred.apiKey)   (body as Record<string, unknown>).api_key_enc  = JSON.stringify(await encryptVault(cred.apiKey, masterPassword));
      if (cred.notes)    (body as Record<string, unknown>).notes_enc    = JSON.stringify(await encryptVault(cred.notes, masterPassword));

      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/credentials`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(body),
      });
      if (insRes.ok) migrated++;
      else { console.error("Insert failed", cred.id, await insRes.text()); skipped++; }
    } catch (err) {
      console.error("Migration error for", cred.id, err);
      skipped++;
    }
  }

  return NextResponse.json({ migrated, skipped });
}
