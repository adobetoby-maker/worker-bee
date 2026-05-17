#!/usr/bin/env node
/**
 * wb-apply — Worker Bee patch CLI
 *
 * Reads a blueprint branch from manage.worker-bee.app, applies each pending
 * node's claudePrompt using Claude Code CLI, and marks results back.
 *
 * Usage:
 *   node wb-apply.mjs --site <siteId> --branch <branch> --dir <project-path>
 *   node wb-apply.mjs --site <siteId> --branch <branch> --dir <path> --dry-run
 *   node wb-apply.mjs --site <siteId> --branch <branch> --dir <path> --node node-3
 *
 * The cork board in manage.worker-bee.app shows apply status in real time —
 * each card turns green (applied), red (failed), or stays amber (pending).
 *
 * PATCH FENCE: every claudePrompt in patch-mode blueprints already starts with
 * the PATCH MODE constraint header, so Claude Code will not touch CSS/Tailwind.
 */

import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const API_BASE = 'https://manage.worker-bee.app'

const { values: args } = parseArgs({
  options: {
    site:      { type: 'string' },
    branch:    { type: 'string' },
    dir:       { type: 'string' },
    node:      { type: 'string' },     // apply a single node ID
    'dry-run': { type: 'boolean', default: false },
    parallel:  { type: 'boolean', default: false },
  },
  strict: false,
})

if (!args.site || !args.branch || !args.dir) {
  console.error('Usage: node wb-apply.mjs --site <siteId> --branch <branch> --dir <path>')
  process.exit(1)
}

async function fetchNodes() {
  const url = `${API_BASE}/api/blueprints/apply-branch?siteId=${args.site}&branch=${encodeURIComponent(args.branch)}`
  const res = await fetch(url)
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function markNode(nodeId, applyStatus) {
  await fetch(`${API_BASE}/api/blueprints/apply-branch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      siteId: args.site,
      branch: args.branch,
      nodeId,
      applyStatus,
      appliedAt: applyStatus === 'applied' ? new Date().toISOString() : undefined,
    }),
  })
}

async function applyNode(node) {
  const prompt = node.data?.claudePrompt
  if (!prompt) {
    console.log(`  ⚠  Node ${node.id} has no claudePrompt — skipping`)
    await markNode(node.id, 'skipped')
    return
  }

  console.log(`\n┌─ [${node.id}] ${node.data?.title ?? 'Untitled'}`)
  console.log(`│  Priority: ${node.data?.priority ?? '?'} | Effort: ${node.data?.effort ?? '?'} | Type: ${node.data?.type ?? '?'}`)
  console.log(`│  Prompt: ${prompt.slice(0, 120).replace(/\n/g, ' ')}…`)

  if (args['dry-run']) {
    console.log(`└─ [DRY RUN] would run: claude --print --dangerously-skip-permissions in ${args.dir}`)
    return
  }

  try {
    // Use spawnSync with args as array — prompt is internal trusted data, not user shell input
    const result = spawnSync('claude', ['--print', '--dangerously-skip-permissions', prompt], {
      cwd: args.dir,
      timeout: 600_000,   // 10 min per node
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (result.status !== 0) {
      throw new Error(result.stderr?.slice(0, 300) ?? `exit ${result.status}`)
    }

    console.log(`└─ ✓ Applied`)
    if (result.stdout) console.log(result.stdout.slice(0, 400))
    await markNode(node.id, 'applied')
  } catch (err) {
    console.error(`└─ ✗ Failed: ${err.message?.slice(0, 200)}`)
    await markNode(node.id, 'failed')
  }
}

async function main() {
  console.log(`\nWorker Bee Apply`)
  console.log(`  Site:   ${args.site}`)
  console.log(`  Branch: ${args.branch}`)
  console.log(`  Dir:    ${args.dir}`)
  if (args['dry-run']) console.log(`  Mode:   DRY RUN`)
  console.log()

  const { nodes, pendingCount } = await fetchNodes()

  let targets = nodes.filter(n => {
    const s = n.data?.applyStatus
    return !s || s === 'pending' || s === 'failed'
  })

  if (args.node) {
    targets = targets.filter(n => n.id === args.node)
    if (!targets.length) {
      console.error(`Node "${args.node}" not found or already applied`)
      process.exit(1)
    }
  }

  console.log(`${pendingCount} pending node(s) in branch "${args.branch}"`)
  console.log(`Applying ${targets.length} node(s)...`)

  if (args.parallel) {
    await Promise.all(targets.map(applyNode))
  } else {
    for (const node of targets) {
      await applyNode(node)
    }
  }

  console.log('\n✓ Done. Review applied nodes on the Blueprint Canvas:')
  console.log(`  https://manage.worker-bee.app/sites/${args.site}/blueprint`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
