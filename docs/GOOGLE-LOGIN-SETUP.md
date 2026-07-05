# Google Sign-In Setup — manage.worker-bee.app

> Built by ATLAS

The "Continue with Google" button on `/login` is credential-gated: it renders
only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set, and `/api/auth/google`
returns 404 until `GOOGLE_CLIENT_ID` is set. Nothing appears in production
until you complete these steps.

## 1. Google Cloud Console

1. Go to https://console.cloud.google.com/ and select (or create) a project,
   e.g. `worker-bee-admin`.
2. **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type: **External** (Internal is only available on Workspace).
   - App name: `Worker Bee Console`. Support email: adobetoby@gmail.com.
   - No scopes need to be added beyond the defaults (GIS ID tokens use
     `openid email profile` implicitly).
   - Publishing status can stay **Testing** — add adobetoby@gmail.com as a
     test user. (Testing mode is fine since only allowlisted emails can log
     in anyway.)
3. **Credentials** (APIs & Services → Credentials):
   - Create credentials → **OAuth client ID** → Application type: **Web application**.
   - Name: `manage.worker-bee.app`.
   - **Authorized JavaScript origins** — add BOTH:
     - `https://manage.worker-bee.app`
     - `http://localhost:3000`
   - **Authorized redirect URIs: leave empty.** Google Identity Services
     (the `accounts.google.com/gsi/client` popup/One-Tap flow) does not use a
     redirect URI.
4. Copy the client ID — it looks like
   `1234567890-abc123def456.apps.googleusercontent.com`.

## 2. Vercel environment variables

Both vars get the SAME value (the client ID from step 1.4):

```bash
cd /Users/drive/manage-worker-bee
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID   # paste client ID — all environments
vercel env add GOOGLE_CLIENT_ID               # paste same client ID — all environments
```

Optional — restrict which Google accounts may sign in (comma-separated;
defaults to `adobetoby@gmail.com` when unset):

```bash
vercel env add ALLOWED_ADMIN_EMAILS
```

For local dev, add the same lines to `.env.local`:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id>
GOOGLE_CLIENT_ID=<client id>
```

## 3. Redeploy

`NEXT_PUBLIC_*` vars are inlined at build time, so a redeploy is required:

```bash
vercel --prod
```

## 4. Verify

1. Open https://manage.worker-bee.app/login — the "Continue with Google"
   button should now render below the password form.
2. Sign in with adobetoby@gmail.com → lands on `/sites`.
3. Sign in with any non-allowlisted Google account → "Google sign-in failed —
   account not authorized."

## How the server verifies

`POST /api/auth/google` fetches
`https://oauth2.googleapis.com/tokeninfo?id_token=...` and requires:

- `aud` === `GOOGLE_CLIENT_ID`
- `email_verified` === `"true"`
- `email` ∈ `ALLOWED_ADMIN_EMAILS` (default `adobetoby@gmail.com`)

On success it issues the exact same `wb_admin_session` HMAC cookie as the
password login — no separate session system.
