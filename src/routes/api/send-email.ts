import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const Route = createFileRoute("/api/send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          if (!auth?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const token = auth.slice(7);

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
          if (claimsErr || !claims?.claims?.sub) {
            return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
          }
          const userId = claims.claims.sub;

          const body = await request.json();
          const { emailId, to, cc, bcc, subject, html, attachments } = body as {
            emailId: string;
            to: string;
            cc?: string;
            bcc?: string;
            subject: string;
            html: string;
            attachments?: { storage_path: string; filename: string }[];
          };

          if (!to || !subject || !html) {
            return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
          }

          // Resolve attachments → base64 content via signed download
          const resendAttachments: { filename: string; content: string }[] = [];
          if (attachments?.length) {
            for (const a of attachments) {
              const { data: file } = await supabaseAdmin.storage
                .from("email-attachments")
                .download(a.storage_path);
              if (file) {
                const buf = await file.arrayBuffer();
                const b64 = Buffer.from(buf).toString("base64");
                resendAttachments.push({ filename: a.filename, content: b64 });
              }
            }
          }

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
            return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500 });
          }

          const payload: Record<string, unknown> = {
            from: "Worker Bee <onboarding@resend.dev>",
            to: [to],
            subject,
            html,
          };
          if (cc) payload.cc = [cc];
          if (bcc) payload.bcc = [bcc];
          if (resendAttachments.length) payload.attachments = resendAttachments;

          const res = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify(payload),
          });
          const result = await res.json();

          if (!res.ok) {
            await supabaseAdmin
              .from("emails")
              .update({ status: "failed", error_message: JSON.stringify(result) })
              .eq("id", emailId)
              .eq("user_id", userId);
            return new Response(JSON.stringify({ error: result }), { status: res.status });
          }

          await supabaseAdmin
            .from("emails")
            .update({
              status: "sent",
              resend_id: (result as { id?: string }).id ?? null,
              sent_at: new Date().toISOString(),
            })
            .eq("id", emailId)
            .eq("user_id", userId);

          return new Response(JSON.stringify({ ok: true, id: (result as { id?: string }).id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
        }
      },
    },
  },
});