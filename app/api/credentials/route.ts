import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/vaultStore";
import { listCredentials, createCredential } from "@/lib/vaultStoreDB";
import type { Credential } from "@/lib/vaultStore";

function getMasterPassword(req: NextRequest): string | null {
  const token = req.cookies.get("vault_session")?.value;
  if (!token) return null;
  return getSession(token);
}

function locked() {
  return NextResponse.json({ error: "Vault is locked" }, { status: 401 });
}

// GET /api/credentials?project=X&category=Y&q=search
export async function GET(req: NextRequest) {
  const masterPassword = getMasterPassword(req);
  if (!masterPassword) return locked();

  const { searchParams } = req.nextUrl;
  const project  = searchParams.get("project") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const q        = searchParams.get("q") ?? undefined;

  try {
    const result = await listCredentials({ project, category, q });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/credentials — add new
export async function POST(req: NextRequest) {
  const masterPassword = getMasterPassword(req);
  if (!masterPassword) return locked();

  const mpHeader = req.headers.get("x-master-password");
  if (!mpHeader) {
    return NextResponse.json({ error: "x-master-password header required" }, { status: 400 });
  }

  const body: Omit<Credential, "id" | "createdAt" | "updatedAt"> = await req.json();
  if (!body.title || !body.category) {
    return NextResponse.json({ error: "title and category required" }, { status: 400 });
  }

  try {
    const entry = await createCredential(body, mpHeader);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
