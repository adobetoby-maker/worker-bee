# Phase 04 — Deploy

## Purpose

Push the finished site to Vercel, assign a subdomain, disable auth protection,
and deliver the live URL to the client record.

## Steps

### 1. Pre-deploy checks

```bash
cd {projectPath}
npm run build     # must exit 0
npm run lint      # fix any errors (warnings OK)
```

If build fails → run one more fix iteration (don't loop back to visual loop, just fix the specific error).

### 2. Init git and push to GitHub (optional but preferred)

```bash
git init && git add . && git commit -m "Initial build — {businessName}"
gh repo create {slug} --public --source=. --push
```

### 3. Deploy to Vercel

```bash
cd {projectPath}
vercel --yes --prod
```

Capture the deployment URL from stdout (format: `https://{slug}-{hash}.vercel.app`).

### 4. Assign worker-bee subdomain

```bash
vercel alias set {deployUrl} {slug}.worker-bee.app
```

The target is `{slug}.worker-bee.app`. If slug conflicts, use `{slug}-{year}.worker-bee.app`.

### 5. Disable deployment protection

Vercel enables protection by default. Remove it:

```bash
# Get project ID first
PROJECT_ID=$(vercel project ls --json | jq -r '.[] | select(.name == "{slug}") | .id')

# Read Vercel token
TOKEN=$(cat "/Users/drive/Library/Application Support/com.vercel.cli/auth.json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.values())[0]['token'])")

# Disable protection
curl -s -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection": null, "passwordProtection": null}'
```

Verify with: `curl -I https://{slug}.worker-bee.app` — should return 200.

### 6. Set environment variables (if needed)

```bash
# If the site has a contact form with Supabase:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Redeploy after setting env vars
vercel --yes --prod
```

### 7. Update Supabase — mark build done

Via the manage-worker-bee Supabase client, update the submission record:
```json
{
  "status": "live",
  "deployUrl": "https://{slug}.worker-bee.app",
  "buildCompletedAt": "2026-05-18T..."
}
```

And update the build log:
```json
{
  "status": "done",
  "deployUrl": "https://{slug}.worker-bee.app",
  "phases": { "research": "done", "scaffold": "done", "visual-loop": "done", "deploy": "done" }
}
```

### 8. Update Blueprint in manage-worker-bee dashboard

```bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \
  -H "content-type: application/json" \
  -d '{
    "siteId": "{siteId}",
    "summary": "{businessName} — Live at {slug}.worker-bee.app. Built in {n} visual iterations, final score {score}/100."
  }'
```

## Exit Criteria

- `curl -I https://{slug}.worker-bee.app` returns HTTP 200
- Supabase submission record status = 'live'
- Build log status = 'done'
- Live URL stored in build log and submission record
- Blueprint summary updated in manage-worker-bee dashboard

## Deliverable

```
✅ {businessName} is live at https://{slug}.worker-bee.app
   Final quality score: {score}/100
   Build iterations: {n}/10
   Deployed: {timestamp}
```
