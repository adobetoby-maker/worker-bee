
## OpenClaw — Shell Layout

Build the visual foundation for an Ollama agent interface with a dark industrial cyberpunk aesthetic. No functionality yet — pure layout, design system, and animations.

### Design system (src/styles.css)
- **Colors** (oklch): bg `#080808`, surface `#0f0f0f`, border `#1f1f1f`, neon orange `#ff6b00` (primary), electric green `#39ff14` (success), red `#ff3333` (error), muted gray text.
- **Fonts**: Load JetBrains Mono + IBM Plex Sans from Google Fonts in `__root.tsx`. Map `--font-mono` → JetBrains Mono (UI labels, badges, log, code), `--font-sans` → IBM Plex Sans (body).
- **Keyframes**:
  - `blink` — terminal cursor (1s steps)
  - `pulse-neon` — orange glow pulse for streaming/active states
  - `slide-down` — panel transitions (200ms ease-out)
  - `swing-claw` — claw SVG oscillates ±15° when agent active
- Subtle scanline/grain texture on background for industrial feel.

### Layout (src/routes/index.tsx)
Single-page shell with local state (`activeView: 'chat' | 'tools' | 'config'`) — no routing yet since there's no functionality.

**Header (58px, sticky)**
- Left: animated SVG claw logo (3 prongs, orange stroke, `swing-claw` animation) + wordmark `OPEN` (orange) `CLAW` (green), JetBrains Mono, tracked-out.
- Right: status cluster
  - Connection dot (green pulse) + `OLLAMA::CONNECTED`
  - Active model badge: `[ MODEL: llama3.1:8b ]`
  - Tool count badge: `[ TOOLS: 4 ]`
- Bottom border in neon orange at low opacity.

**Left sidebar (240px, full-height)**
- Three nav buttons stacked, JetBrains Mono uppercase: `CHAT 💬`, `TOOLS 🔧`, `CONFIG ⚙`. Active state = orange left border + orange tint background + green text indicator.
- Divider.
- Agent log panel (scrollable, fills remaining height): header `// AGENT_LOG`, then mock timestamped lines:
  - `[12:04:21] [OK]  model loaded` (green)
  - `[12:04:23] [→]   tool:web_search` (orange)
  - `[12:04:25] [ERR] timeout 5000ms` (red)
  - mix of ~12 sample lines so it scrolls.
- Blinking cursor at the bottom.

**Main panel (flex: 1)**
- Swaps placeholder content per active nav (slide-down animation on switch):
  - **CHAT**: empty state — large claw watermark, tagline `// awaiting input`, blinking cursor.
  - **TOOLS**: empty state — `// 4 tools registered` heading placeholder.
  - **CONFIG**: empty state — `// runtime configuration` heading placeholder.
- Each view wrapped so the `slide-down` keyframe plays on mount.

### Components
- `src/components/Header.tsx`
- `src/components/ClawLogo.tsx` (animated SVG)
- `src/components/Sidebar.tsx` (nav + agent log)
- `src/components/AgentLog.tsx`
- `src/components/StatusBadge.tsx`

### Replace
- Remove placeholder content in `src/routes/index.tsx` and update `__root.tsx` head: title `OpenClaw — Local AI Agents`, matching description, and Google Fonts `<link>` entries.

End result: a polished, dark, terminal-flavored shell ready for chat, tools, and config to be wired up next.
