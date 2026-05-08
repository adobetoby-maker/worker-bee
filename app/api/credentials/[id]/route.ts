import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  saveVaultFile,
  updateCredential,
  deleteCredential,
} from "@/lib/vaultStore";

async function getVaultSession(req: NextRequest) {
  const id = req.cookies.get("vault_session")?.value;
  if (!id) return null;
  const data = await getSession(id);
  return { id, data };
}

function locked() {
  return NextResponse.json({ error: "Vault is locked" }, { status: 401 });
}

type Params = { params: Promise<{ id: string }> };

// GET /api/credentials/[id] — full credential INCLUDING secrets
export async function GET(req: NextRequest, { params }: Params) {
  const s = await getVaultSession(req);
  if (!s?.data) return locked();

  const { id } = await params;
  const cred = s.data.credentials.find((c) => c.id === id);
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(cred); // full, including password/apiKey
}

// PATCH /api/credentials/[id] — update
export async function PATCH(req: NextRequest, { params }: Params) {
  const s = await getVaultSession(req);
  if (!s?.data) return locked();

  const masterPassword = req.headers.get("x-master-password");
  if (!masterPassword) {
    return NextResponse.json({ error: "x-master-password required" }, { status: 400 });
  }

  const { id } = await params;
  const updates = await req.json();

  try {
    updateCredential(s.data, id, updates);
    updateSession(s.id, s.data);
    await saveVaultFile(s.data, masterPassword);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// DELETE /api/credentials/[id] — remove
export async function DELETE(req: NextRequest, { params }: Params) {
  const s = await getVaultSession(req);
  if (!s?.data) return locked();

  const masterPassword = req.headers.get("x-master-password");
  if (!masterPassword) {
    return NextResponse.json({ error: "x-master-password required" }, { status: 400 });
  }

  const { id } = await params;
  deleteCredential(s.data, id);
  updateSession(s.id, s.data);
  await saveVaultFile(s.data, masterPassword);
  return NextResponse.json({ ok: true });
}
