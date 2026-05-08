import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  saveVaultFile,
  addCredential,
  getAllProjects,
  type Credential,
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

// GET /api/credentials?project=X&category=Y&q=search
export async function GET(req: NextRequest) {
  const s = await getVaultSession(req);
  if (!s?.data) return locked();

  const { searchParams } = req.nextUrl;
  const project  = searchParams.get("project");
  const category = searchParams.get("category");
  const query    = searchParams.get("q")?.toLowerCase();

  let creds = s.data.credentials;

  if (project)  creds = creds.filter((c) => c.project === project);
  if (category) creds = creds.filter((c) => c.category === category);
  if (query) {
    creds = creds.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.site?.toLowerCase().includes(query) ||
        c.project?.toLowerCase().includes(query) ||
        c.username?.toLowerCase().includes(query) ||
        c.notes?.toLowerCase().includes(query)
    );
  }

  // Never return passwords/keys in list view — only on explicit single fetch
  const safe = creds.map(({ password: _, apiKey: __, ...c }) => c);

  return NextResponse.json({
    credentials: safe,
    projects: getAllProjects(s.data),
    total: s.data.credentials.length,
  });
}

// POST /api/credentials — add new
export async function POST(req: NextRequest) {
  const s = await getVaultSession(req);
  if (!s?.data) return locked();

  const body: Omit<Credential, "id" | "createdAt" | "updatedAt"> =
    await req.json();
  if (!body.title || !body.category) {
    return NextResponse.json(
      { error: "title and category required" },
      { status: 400 }
    );
  }

  const masterPassword = req.headers.get("x-master-password");
  if (!masterPassword) {
    return NextResponse.json(
      { error: "x-master-password header required to save" },
      { status: 400 }
    );
  }

  const entry = addCredential(s.data, body);
  updateSession(s.id, s.data);
  await saveVaultFile(s.data, masterPassword);

  const { password: _, apiKey: __, ...safe } = entry;
  return NextResponse.json(safe, { status: 201 });
}
