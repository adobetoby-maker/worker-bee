import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface EmailRow {
  id: string;
  folder_id: string | null;
  to_address: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface Attachment {
  id?: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  mime_type?: string;
}

type View = "list" | "compose" | "auth";

export function EmailPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>("auth");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auth form
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");

  // Compose form
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeFolder, setComposeFolder] = useState<string | "">("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");

  // Attach menu
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  // Capture pasted images (screenshots) when composing
  useEffect(() => {
    if (view !== "compose") return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        handleFileUpload(dt.files);
        toast.success(`Pasted ${files.length} file(s)`);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, userId]);

  const triggerFilePicker = (accept?: string, capture?: "user" | "environment") => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    if (accept) input.accept = accept;
    if (capture) input.setAttribute("capture", capture);
    input.onchange = () => handleFileUpload(input.files);
    input.click();
    setAttachMenuOpen(false);
  };

  const captureScreenshot = async () => {
    setAttachMenuOpen(false);
    try {
      // @ts-expect-error getDisplayMedia not in lib.dom for older targets
      const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      // @ts-expect-error ImageCapture is experimental
      const ImageCaptureCtor = window.ImageCapture;
      let blob: Blob;
      if (ImageCaptureCtor) {
        const ic = new ImageCaptureCtor(track);
        blob = await ic.grabFrame().then((bmp: ImageBitmap) => {
          const canvas = document.createElement("canvas");
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          canvas.getContext("2d")!.drawImage(bmp, 0, 0);
          return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
        });
      } else {
        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      }
      stream.getTracks().forEach((t) => t.stop());
      const file = new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      await handleFileUpload(dt.files);
      toast.success("Screenshot attached");
    } catch (err) {
      const msg = (err as Error).message;
      if (!/permission|denied|abort/i.test(msg)) {
        toast.error(`Screenshot failed: ${msg}`);
      }
    }
  };

  // Auth bootstrap
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setView(session?.user ? "list" : "auth");
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setView(data.session?.user ? "list" : "auth");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadFolders = useCallback(async () => {
    const { data } = await supabase.from("email_folders").select("*").order("created_at");
    setFolders((data ?? []) as Folder[]);
  }, []);

  const loadEmails = useCallback(async () => {
    let q = supabase.from("emails").select("*").order("created_at", { ascending: false });
    if (activeFolder) q = q.eq("folder_id", activeFolder);
    const { data } = await q;
    setEmails((data ?? []) as EmailRow[]);
  }, [activeFolder]);

  useEffect(() => {
    if (userId) {
      loadFolders();
      loadEmails();
    }
  }, [userId, loadFolders, loadEmails]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPass,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Check email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPass,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateFolder = async () => {
    const n = newFolderName.trim();
    if (!n || !userId) return;
    const { error } = await supabase.from("email_folders").insert({ name: n, user_id: userId });
    if (error) return toast.error(error.message);
    setNewFolderName("");
    loadFolders();
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Delete this folder? Emails inside will be moved to Unfiled.")) return;
    const { error } = await supabase.from("email_folders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (activeFolder === id) setActiveFolder(null);
    loadFolders();
    loadEmails();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);
    try {
      const newAtt: Attachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 25MB`);
          continue;
        }
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("email-attachments")
          .upload(path, file, { contentType: file.type });
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          continue;
        }
        newAtt.push({
          filename: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type,
        });
      }
      setAttachments((a) => [...a, ...newAtt]);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (idx: number) => {
    const a = attachments[idx];
    await supabase.storage.from("email-attachments").remove([a.storage_path]);
    setAttachments((arr) => arr.filter((_, i) => i !== idx));
  };

  const resetCompose = () => {
    setTo(""); setCc(""); setBcc(""); setSubject(""); setBody("");
    setAttachments([]); setComposeFolder("");
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      return toast.error("To, Subject and Body are required");
    }
    if (!userId) return;
    setSending(true);
    try {
      // 1. Insert email row
      const { data: emailRow, error: insErr } = await supabase
        .from("emails")
        .insert({
          user_id: userId,
          folder_id: composeFolder || null,
          to_address: to.trim(),
          cc_address: cc.trim() || null,
          bcc_address: bcc.trim() || null,
          subject: subject.trim(),
          body_html: body.replace(/\n/g, "<br/>"),
          body_text: body,
          status: "sending",
        })
        .select()
        .single();
      if (insErr || !emailRow) throw insErr ?? new Error("Failed to create email");

      // 2. Link attachments
      if (attachments.length) {
        await supabase.from("email_attachments").insert(
          attachments.map((a) => ({
            user_id: userId,
            email_id: emailRow.id,
            filename: a.filename,
            storage_path: a.storage_path,
            size_bytes: a.size_bytes,
            mime_type: a.mime_type,
          })),
        );
      }

      // 3. Call send route
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          emailId: emailRow.id,
          to: to.trim(),
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: subject.trim(),
          html: body.replace(/\n/g, "<br/>"),
          attachments: attachments.map((a) => ({
            storage_path: a.storage_path,
            filename: a.filename,
          })),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(`Send failed: ${result.error?.message || JSON.stringify(result.error) || "unknown"}`);
      } else {
        toast.success("Email sent!");
        resetCompose();
        setView("list");
        loadEmails();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  // ----- AUTH VIEW -----
  if (view === "auth") {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <form
          onSubmit={handleAuth}
          className="w-full max-w-sm space-y-4 p-6 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">📧</div>
            <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground">
              Email System
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Sign {authMode === "signup" ? "up" : "in"} to access your emails
            </p>
          </div>
          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded text-sm bg-background border border-border text-foreground"
          />
          <input
            type="password"
            placeholder="Password"
            value={authPass}
            onChange={(e) => setAuthPass(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 rounded text-sm bg-background border border-border text-foreground"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-mono uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : authMode === "signup" ? "Sign Up" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {authMode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    );
  }

  // ----- MAIN VIEW -----
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg">📧</span>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
            Email
          </span>
        </div>
        <div className="flex items-center gap-2">
          {view === "list" && (
            <button
              onClick={() => setView("compose")}
              className="px-3 py-1 rounded text-xs font-mono uppercase bg-primary text-primary-foreground hover:opacity-90"
            >
              ✉ Compose
            </button>
          )}
          {view === "compose" && (
            <button
              onClick={() => { resetCompose(); setView("list"); }}
              className="px-3 py-1 rounded text-xs font-mono uppercase bg-surface-2 text-foreground hover:opacity-90"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline"
          >
            sign out
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Folders */}
          <div
            className="w-full md:w-56 shrink-0 p-3 overflow-y-auto"
            style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Folders
            </div>
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full text-left px-2 py-1 rounded text-sm mb-1 ${!activeFolder ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface-2/60"}`}
            >
              📥 All emails
            </button>
            {folders.map((f) => (
              <div key={f.id} className="flex items-center gap-1 mb-1">
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className={`flex-1 text-left px-2 py-1 rounded text-sm truncate ${activeFolder === f.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-surface-2/60"}`}
                >
                  📁 {f.name}
                </button>
                <button
                  onClick={() => handleDeleteFolder(f.id)}
                  className="text-xs text-muted-foreground hover:text-destructive px-1"
                  title="Delete folder"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="mt-3 flex gap-1">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="New folder…"
                className="flex-1 px-2 py-1 rounded text-xs bg-background border border-border text-foreground"
              />
              <button
                onClick={handleCreateFolder}
                className="px-2 py-1 rounded text-xs bg-surface-2 text-foreground hover:opacity-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Email list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {emails.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No emails yet. Click <span className="text-foreground">Compose</span> to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded text-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        → {e.to_address}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          e.status === "sent"
                            ? "bg-success/20 text-success"
                            : e.status === "failed"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-surface-2 text-muted-foreground"
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>
                    <div className="text-foreground font-medium truncate">{e.subject}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(e.sent_at ?? e.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Compose view
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Folder
              </label>
              <select
                value={composeFolder}
                onChange={(e) => setComposeFolder(e.target.value)}
                className="w-full px-2 py-2 rounded text-sm bg-background border border-border text-foreground"
              >
                <option value="">— Unfiled —</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <input
              type="email"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm bg-background border border-border text-foreground"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                placeholder="Cc (optional)"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="px-3 py-2 rounded text-sm bg-background border border-border text-foreground"
              />
              <input
                type="email"
                placeholder="Bcc (optional)"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="px-3 py-2 rounded text-sm bg-background border border-border text-foreground"
              />
            </div>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm bg-background border border-border text-foreground"
            />
            <textarea
              placeholder="Write your message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded text-sm bg-background border border-border text-foreground resize-y"
            />

            {/* Attachments */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Attachments {uploading && "(uploading…)"}
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="text-xs text-muted-foreground"
              />
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <span className="truncate">📎 {a.filename} ({(a.size_bytes / 1024).toFixed(1)} KB)</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-muted-foreground hover:text-destructive ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={sending || uploading}
              className="w-full py-2 rounded text-sm font-mono uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Sending…" : "✉ Send Email"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Sender: onboarding@resend.dev (verify your domain in Resend to send from your own address)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}