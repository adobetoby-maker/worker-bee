import { NextRequest, NextResponse } from "next/server";
import {
  vaultExists,
  unlockVault,
  initVault,
  createSession,
  deleteSession,
} from "@/lib/vaultStore";

// POST /api/auth — unlock existing vault OR create new vault
export async function POST(req: NextRequest) {
  const { masterPassword, action } = await req.json();

  if (!masterPassword || masterPassword.length < 8) {
    return NextResponse.json(
      { error: "Master password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    let data;

    if (action === "create") {
      if (await vaultExists()) {
        return NextResponse.json(
          { error: "Vault already exists. Use action: 'unlock' to sign in." },
          { status: 409 }
        );
      }
      data = await initVault(masterPassword);
    } else {
      // unlock
      if (!(await vaultExists())) {
        return NextResponse.json(
          { error: "No vault found. Create one first." },
          { status: 404 }
        );
      }
      try {
        data = await unlockVault(masterPassword);
      } catch {
        return NextResponse.json(
          { error: "Incorrect master password" },
          { status: 401 }
        );
      }
    }

    const sessionId = createSession(masterPassword);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("vault_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 4, // 4 hours
      path: "/",
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Auth error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/auth — lock vault
export async function DELETE(req: NextRequest) {
  const sessionId = req.cookies.get("vault_session")?.value;
  if (sessionId) deleteSession(sessionId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("vault_session", "", { maxAge: 0, path: "/" });
  return res;
}
