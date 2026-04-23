
-- Folders table
CREATE TABLE public.email_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own folders select" ON public.email_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own folders insert" ON public.email_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own folders update" ON public.email_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own folders delete" ON public.email_folders FOR DELETE USING (auth.uid() = user_id);

-- Emails table
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.email_folders(id) ON DELETE SET NULL,
  to_address TEXT NOT NULL,
  cc_address TEXT,
  bcc_address TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  resend_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own emails select" ON public.emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own emails insert" ON public.emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own emails update" ON public.emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own emails delete" ON public.emails FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_emails_user ON public.emails(user_id);
CREATE INDEX idx_emails_folder ON public.emails(folder_id);

-- Attachments table
CREATE TABLE public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own attach select" ON public.email_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own attach insert" ON public.email_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own attach update" ON public.email_attachments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own attach delete" ON public.email_attachments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_attach_email ON public.email_attachments(email_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_folders_updated BEFORE UPDATE ON public.email_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_emails_updated BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-attachments', 'email-attachments', false, 26214400);

CREATE POLICY "own attach files select" ON storage.objects FOR SELECT
  USING (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own attach files insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own attach files delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
