import { NextResponse } from "next/server";
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";
  // Test the actual Supabase read
  let supaResult = "unknown";
  try {
    const res = await fetch(
      `${url}/rest/v1/vault_storage?id=eq.default&select=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const body = await res.text();
    supaResult = `${res.status}: ${body.slice(0, 200)}`;
  } catch (e: unknown) {
    supaResult = `throw: ${e instanceof Error ? e.message : String(e)}`;
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? 'MISSING'
  return NextResponse.json({
    url_prefix: url.slice(0, 30),
    key_prefix: key.slice(0, 20),
    supabase_test: supaResult,
    anthropic_key_prefix: anthropicKey.slice(0, 15),
    anthropic_key_length: anthropicKey.length,
  });
}
