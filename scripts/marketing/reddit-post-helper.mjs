#!/usr/bin/env node
/**
 * reddit-post-helper.mjs
 * Generates Reddit post content per subreddit and opens the browser
 * to the correct submission URL with content pre-filled in clipboard.
 *
 * Does NOT auto-post. Reddit's anti-spam systems are aggressive.
 * This script handles the mechanical setup — you post manually.
 *
 * Usage:
 *   node reddit-post-helper.mjs --product "Worker Bee" \
 *     --url https://manage.worker-bee.app \
 *     --description "Agency management tool for freelancers" \
 *     --subreddit entrepreneur
 *
 *   # Generate for all subreddits:
 *   node reddit-post-helper.mjs --product "..." --url "..." --description "..." --all
 *
 * Available --subreddit values:
 *   entrepreneur | startups | saas | indiebiz | smallbusiness |
 *   webdev | freelance | sidehustle | agency | all
 *
 * What it does:
 *   1. Generates a tailored title + body for the target subreddit
 *   2. Copies the post content to clipboard
 *   3. Opens Chrome to the correct Reddit submit URL (r/subreddit/submit)
 *   4. Prints full content to terminal so you can paste manually
 */

import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

// ─── Subreddit Templates ────────────────────────────────────────────────────
// Each template gets product, url, description injected.
// Title + body are tuned to each community's norms.

const SUBREDDITS = {
  entrepreneur: {
    name: 'entrepreneur',
    url: 'https://www.reddit.com/r/Entrepreneur/submit',
    titleTemplate: ({ product, description }) =>
      `Built ${product} to solve a problem I had — ${description} (looking for feedback)`,
    bodyTemplate: ({ product, url, description }) => `
Hey r/Entrepreneur,

I've been working on ${product} — ${description}.

URL: ${url}

A bit of context:
- Started it because I was frustrated with the existing tools
- Launched publicly a few weeks ago
- Currently free to try, no credit card needed

I'd love honest feedback from people who've dealt with similar problems. What would make this actually useful for your business?

Happy to answer questions about the build process too if anyone's interested.
`.trim(),
  },

  startups: {
    name: 'startups',
    url: 'https://www.reddit.com/r/startups/submit',
    titleTemplate: ({ product, description }) =>
      `Show HN-style: ${product} — ${description}`,
    bodyTemplate: ({ product, url, description }) => `
**What:** ${product} — ${description}

**Why I built it:** The existing solutions were either overpriced, over-engineered, or both. I wanted something focused and usable in under 5 minutes.

**Where it's at:** Early but functional. Link: ${url}

**What I'm looking for:** Honest criticism. Especially interested in:
- What features are missing that you'd need before using it?
- Is the pricing model sensible?
- What's your first impression from the landing page?

No fluff, just trying to build something people actually want.
`.trim(),
  },

  saas: {
    name: 'SaaS',
    url: 'https://www.reddit.com/r/SaaS/submit',
    titleTemplate: ({ product, description }) =>
      `Feedback wanted: ${product} — ${description}`,
    bodyTemplate: ({ product, url, description }) => `
**${product}**
${description}

${url}

Built this for a specific niche I know well. It's free to start.

**The problem it solves:** [Expand with 2-3 sentences about the specific pain point]

**Who it's for:** Small teams and freelancers who [specific use case]

**Where I need feedback:**
1. Does the value prop land on the homepage?
2. Is the onboarding clear?
3. What would stop you from signing up?

Thanks in advance. I read every comment.
`.trim(),
  },

  indiebiz: {
    name: 'indiebiz',
    url: 'https://www.reddit.com/r/indiebiz/submit',
    titleTemplate: ({ product, description }) =>
      `Just launched ${product}: ${description}`,
    bodyTemplate: ({ product, url, description }) => `
After a few months of building in public, ${product} is live.

${description}

Link: ${url}

It's free to start. Built solo, no VC, no team.

Would love to connect with other indie founders — especially if you're in the [agency / freelance / SaaS] space.

What are you building?
`.trim(),
  },

  smallbusiness: {
    name: 'smallbusiness',
    url: 'https://www.reddit.com/r/smallbusiness/submit',
    titleTemplate: ({ product, description }) =>
      `Tool that's saved me time running my business: ${product}`,
    bodyTemplate: ({ product, url, description }) => `
I'll keep this simple.

I built ${product} because I was spending too much time on [specific task]. ${description}

It's at ${url} and free to try.

Not a pitch — I'm genuinely curious if this is a problem other small business owners face, or if I'm the only one. What tools are you using for [relevant task]?
`.trim(),
  },

  webdev: {
    name: 'webdev',
    url: 'https://www.reddit.com/r/webdev/submit',
    titleTemplate: ({ product, description }) =>
      `Built this with [tech stack]: ${product} — ${description}`,
    bodyTemplate: ({ product, url, description }) => `
**Project:** ${product}
**What it does:** ${description}
**Link:** ${url}

**Stack:** [Fill in: Next.js / Cloudflare Workers / Supabase / etc.]

**Interesting technical decisions:**
- [Something about the architecture]
- [Something about performance / scale]
- [Something you'd do differently]

Open to questions on the technical side. Also happy to hear UX feedback from other devs.
`.trim(),
  },

  freelance: {
    name: 'freelance',
    url: 'https://www.reddit.com/r/freelance/submit',
    titleTemplate: ({ product, description }) =>
      `Tool I use to manage my freelance clients: ${product}`,
    bodyTemplate: ({ product, url, description }) => `
I've been freelancing for [X years] and client management always felt like the most annoying overhead.

I built ${product} to handle [specific aspect]. ${description}

${url} — free to try.

Curious what tools other freelancers are using. Particularly interested in:
- How you track which clients owe you money
- How you manage multiple projects at once
- What you wish existed that doesn't

Not trying to sell you anything, genuinely want to know what the community uses.
`.trim(),
  },

  sidehustle: {
    name: 'sidehustle',
    url: 'https://www.reddit.com/r/sidehustle/submit',
    titleTemplate: ({ product }) =>
      `My side project is now generating revenue: here's what I built and what I learned`,
    bodyTemplate: ({ product, url, description }) => `
Started ${product} as a weekend project. ${description}

${url}

What I did:
- Spent [X months] building the MVP
- Launched quietly, got first customers from [source]
- Now at [$X / month] MRR (or "just getting started")

What I learned that I wish someone told me:
- [Lesson 1]
- [Lesson 2]
- [Lesson 3]

Happy to answer questions. Also curious: what side projects are you running right now?
`.trim(),
  },

  agency: {
    name: 'agency',
    url: 'https://www.reddit.com/r/agency/submit',
    titleTemplate: ({ product, description }) =>
      `Tool built specifically for agency operations: ${product}`,
    bodyTemplate: ({ product, url, description }) => `
Running an agency means managing clients, projects, and deliverables simultaneously. ${product} was built to handle [specific pain point agencies have]. ${description}

${url}

Free to start. Built by someone who runs a small agency and was frustrated with tools that weren't designed for this workflow.

Questions for the community:
- What's your current client management setup?
- Where do things fall through the cracks?
- What would you pay for if it actually worked?
`.trim(),
  },
};

// ─── Copy to clipboard (macOS) ──────────────────────────────────────────────
function copyToClipboard(text) {
  try {
    // execFileSync avoids shell invocation — no interpolation risk
    execFileSync('pbcopy', [], { input: text, encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

// ─── Generate and open ──────────────────────────────────────────────────────
async function generateAndOpen(opts = {}) {
  const { product, url, description, subreddit, openBrowser = true } = opts;

  if (!product || !url || !description) {
    throw new Error('Required: product, url, description');
  }

  const targets = subreddit === 'all' || !subreddit
    ? Object.values(SUBREDDITS)
    : [SUBREDDITS[subreddit]].filter(Boolean);

  if (targets.length === 0) {
    throw new Error(`Unknown subreddit: ${subreddit}. Valid options: ${Object.keys(SUBREDDITS).join(', ')}, all`);
  }

  const generated = targets.map((sr) => ({
    subreddit: sr.name,
    submitUrl: sr.url,
    title: sr.titleTemplate({ product, url, description }),
    body: sr.bodyTemplate({ product, url, description }),
  }));

  // Print all generated content
  console.log('\n' + '='.repeat(70));
  for (const g of generated) {
    console.log(`\n[r/${g.subreddit}]`);
    console.log(`Submit URL: ${g.submitUrl}`);
    console.log(`\nTitle:\n${g.title}`);
    console.log(`\nBody:\n${g.body}`);
    console.log('\n' + '-'.repeat(70));
  }

  // Copy first result to clipboard
  const first = generated[0];
  const clipboardContent = `Title: ${first.title}\n\n${first.body}`;
  const copied = copyToClipboard(clipboardContent);
  if (copied) {
    console.log(`\nCopied r/${first.subreddit} post content to clipboard.`);
  }

  // Open browser to submit URL
  if (openBrowser) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    for (const g of generated) {
      console.log(`\nOpening r/${g.subreddit} submit page...`);
      await page.goto(g.submitUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Copy this subreddit's content to clipboard
      const content = `Title: ${g.title}\n\n${g.body}`;
      copyToClipboard(content);
      console.log(`Content for r/${g.subreddit} copied to clipboard. Paste into the form.`);

      if (generated.length > 1) {
        // Brief pause between tabs if submitting to multiple
        await page.waitForTimeout(3000);
        await context.newPage().then((p) => p.goto(generated[generated.indexOf(g) + 1]?.submitUrl ?? 'about:blank').catch(() => {}));
      }
    }

    console.log('\nBrowser open. Paste from clipboard into each form and submit manually.');
    console.log('Press Ctrl+C when done.');
    await new Promise(() => {}); // Keep alive until user kills it
  }

  return generated;
}

// ─── CLI ────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(new URL(import.meta.url))) {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const opts = {
    product: get('--product'),
    url: get('--url'),
    description: get('--description'),
    subreddit: args.includes('--all') ? 'all' : get('--subreddit'),
    openBrowser: get('--no-browser') === undefined,
  };

  if (!opts.product || !opts.url || !opts.description) {
    console.error(
      'Usage: node reddit-post-helper.mjs --product "Name" --url "https://..." --description "What it does" [--subreddit entrepreneur|all]'
    );
    process.exit(1);
  }

  generateAndOpen(opts).catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

export { generateAndOpen, SUBREDDITS };
