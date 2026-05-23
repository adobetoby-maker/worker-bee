# Phase 01 — Research & Project Brief

## Purpose

Turn the raw wizard data and blueprint nodes into a concrete, buildable project brief.
This phase produces three outputs:
1. A project directory name and path
2. A `BRIEF.md` written to the project root (internal reference, not shipped)
3. An updated build log marking research as done

## Inputs

From the build job:
- `wizard.businessName` — the business name (becomes the project slug)
- `wizard.description` — what the business does
- `wizard.audience` — target customer persona
- `wizard.cta` — primary call to action
- `wizard.pages` — page list (Home, About, Services, etc.)
- `wizard.style` — design style (minimal, bold, luxury, playful, corporate, editorial)
- `wizard.inspiration` — optional inspiration notes
- `blueprint.nodes` — the corkboard cards; each node is a page, section, or component
- `blueprint.edges` — navigation and data flow relationships

## Steps

### 1. Derive project slug

```
slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
projectPath = /Users/drive/{slug}
```

If the path already exists, append `-v2`, `-v3`, etc.

### 2. Identify the site structure from blueprint nodes

For each node in `blueprint.nodes`:
- `data.type === 'page'` → becomes a Next.js `app/{route}/page.tsx`
- `data.type === 'section'` → becomes a React component in `components/`
- `data.type === 'component'` → becomes a shared UI component in `components/`
- `data.type === 'api'` → becomes a Route Handler in `app/api/{name}/route.ts`
- `data.type === 'data'` → becomes a TypeScript data file in `lib/{name}.ts`

### 3. Determine the color palette

Based on `wizard.style`:
- **minimal** → white #FFFFFF, slate #F8FAFC, ink #0F172A, accent #6366F1
- **bold** → black #0A0A0A, white #FFFFFF, accent per brand (bright/saturated)
- **luxury** → near-black #1A1208, cream #FAF7F0, gold #C9A96E, muted #8B7355
- **playful** → white #FFFFFF, soft yellow #FEFCE8, coral #F97316, slate #1E293B
- **corporate** → white #FFFFFF, light gray #F1F5F9, navy #1E3A5F, accent #2563EB
- **editorial** → off-white #FAFAF9, charcoal #1C1917, warm gray #78716C, accent chosen from inspiration

Adjust palette to match inspiration cues. Document in BRIEF.md.

### 4. Write BRIEF.md

```markdown
# {businessName} — Project Brief

## Business
- **Name:** {businessName}
- **Description:** {description (cleaned if available)}
- **Audience:** {audience}
- **Primary CTA:** {cta}

## Design
- **Style:** {style}
- **Palette:** (list from step 3)
- **Inspiration:** {inspiration}

## Pages
{list pages from wizard.pages}

## Blueprint Map
{for each node: - {node.data.title} ({node.data.type}) → {route/component path}}

## Key Constraints
- Stack: Next.js 16, React 19, Tailwind v4, TypeScript, Framer Motion
- All @layer base resets in globals.css
- All whileInView animations: viewport={{ once: true, amount: 0.1 }}
- Mobile-first — every component must work at 390px
- No placeholder lorem ipsum — all copy must be real, tailored to the business
```

### 5. Update build log

```json
{ "phases": { "research": "done" }, "log": ["Research complete — {slug} at {projectPath}"] }
```

## Exit Criteria

- Project path determined and confirmed non-conflicting
- BRIEF.md written with real copy outlines (no placeholders)
- Blueprint nodes mapped to file paths
- Build log updated
