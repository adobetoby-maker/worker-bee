import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/vaultStore";
import {
  getCredential,
  updateCredential,
  deleteCredential,
} from "@/lib/vaultStoreDB";

function getMasterPassword(req: NextRequest): string | null {
  const token = req.cookies.get("vault_session")?.value;
  if (!token) return null;
  return getSession(token);
}

function locked() {
  return NextResponse.json({ error: "Vault is locked" }, { status: 401 });
}

type Params = { params: Promise<{ id: string }> };

// GET /api/credentials/[id] — full credential INCLUDING decrypted secrets
export async function GET(req: NextRequest, { params }: Params) {
  const masterPassword = getMasterPassword(req);
  if (!masterPassword) return locked();

  const { id } = await params;
  const mpHeader = req.headers.get("x-master-password") ?? masterPassword;

  const cred = await getCredential(id, mpHeader);
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(cred);
}

// PATCH /api/credentials/[id] — update
export async function PATCH(req: NextRequest, { params }: Params) {
  const masterPassword = getMasterPassword(req);
  if (!masterPassword) return locked();

  const mpHeader = req.headers.get("x-master-password");
  if (!mpHeader) {
    return NextResponse.json({ error: "x-master-password required" }, { status: 400 });
  }

  const { id } = await params;
  const updates = await req.json();

  try {
    await updateCredential(id, updates, mpHeader);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}

// DELETE /api/credentials/[id] — remove
export async function DELETE(req: NextRequest, { params }: Params) {
  const masterPassword = getMasterPassword(req);
  if (!masterPassword) return locked();

  const { id } = await params;

  try {
    await deleteCredential(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
