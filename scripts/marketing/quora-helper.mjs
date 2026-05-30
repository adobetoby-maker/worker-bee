#!/usr/bin/env node
/**
 * quora-helper.mjs
 * Finds relevant Quora questions and opens them for manual answering.
 *
 * Does NOT auto-post answers. Quora enforces strict quality/spam policies
 * and auto-posted answers get collapsed or accounts banned.
 *
 * Usage:
 *   node quora-helper.mjs --topics "agency management,freelance tools,client billing" \
 *     --product "Worker Bee" --url https://manage.worker-bee.app \
 *     --max 10
 *
 *   # Single topic:
 *   node quora-helper.mjs --topic "how to manage freelance clients"
 *
 * What it does:
 *   1. Searches Quora for each topic using the search URL
 *   2. Takes screenshots of results pages
 *   3. Extracts question titles and URLs from the page
 *   4. Opens the most relevant questions in browser tabs
 *   5. Prints a list of questions + answer guidelines per topic
 *   6. Saves results to quora-questions.json for tracking
 *
 * Answer guidelines printed per question:
 *   - Suggested opening hook
 *   - Relevant angle for your product
 *   - Rule: give genuine value first, mention product only if directly relevant
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');

// ─── Search Quora ────────────────────────────────────────────────────────────
async function searchQuora(page, topic, maxResults = 10) {
  const searchUrl = `https://www.quora.com/search?q=${encodeURIComponent(topic)}&type=question`;
  console.log(`\n[Quora] Searching: "${topic}"`);

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

  // Wait for results to render
  await page.waitForTimeout(3000);

  // Screenshot
  const screenshotName = `quora-search-${topic.replace(/\s+/g, '-').slice(0, 40)}.png`;
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, screenshotName),
    fullPage: false,
  });

  // Extract question links from the page
  const questions = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/"]'));
    const seen = new Set();
    const results = [];

    for (const link of links) {
      const href = link.href;
      const text = link.textContent?.trim();

      // Quora question URLs: contain a question-like path (multiple words, no /profile/ etc.)
      if (
        href.includes('quora.com/') &&
        !href.includes('/profile/') &&
        !href.includes('/search') &&
        !href.includes('/topic/') &&
        !href.includes('/login') &&
        !href.includes('/signup') &&
        text &&
        text.length > 20 &&
        text.length < 300 &&
        text.includes(' ') && // must have spaces (real question text)
        !seen.has(href)
      ) {
        seen.add(href);
        results.push({ url: href, title: text });
      }
    }

    return results.slice(0, 20);
  });

  // Filter to likely questions (ends with ?, or contains "how", "what", "why", "which", "best")
  const questionPattern = /\?$|^(how|what|why|which|when|where|who|is |are |can |should |does |do |will )/i;
  const filtered = questions
    .filter((q) => questionPattern.test(q.title.trim()))
    .slice(0, maxResults);

  console.log(`[Quora] Found ${filtered.length} questions for "${topic}"`);
  return { topic, searchUrl, questions: filtered, screenshot: screenshotName };
}

// ─── Generate answer guidance ────────────────────────────────────────────────
function generateAnswerGuidance(question, product, productUrl) {
  const title = question.title.toLowerCase();

  // Detect intent
  const isHowTo = /^how/.test(title);
  const isComparison = /best|vs|compare|alternative/.test(title);
  const isToolQuestion = /tool|software|app|platform|system|manage/.test(title);
  const isProblem = /problem|struggle|challenge|difficult|hard/.test(title);

  let hook = '';
  let angle = '';
  let cta = '';

  if (isHowTo) {
    hook = 'Start with the concrete steps. Lead with the answer, not a preamble.';
    angle = isToolQuestion
      ? `If your workflow answer involves a tool, you can mention ${product} naturally: "I use ${productUrl} for this step — [explain what it does]"`
      : 'Focus on the process. Mention your product only if it directly enables a step you describe.';
  } else if (isComparison) {
    hook = 'Give a neutral breakdown of the options. Readers distrust obviously biased answers.';
    angle = `If ${product} fits one of the comparison slots, mention it with specific differentiation: "Option C is ${product} — good for [specific use case] because [specific reason]."`;
  } else if (isProblem) {
    hook = "Validate the problem first — 'This is genuinely hard because [reason].' Then offer a solution.";
    angle = `Frame ${product} as one solution among a few, not the only answer. Include free/manual alternatives too.`;
  } else {
    hook = 'Answer the core question directly in the first 2 sentences. Most readers skim.';
    angle = `Mention ${product} only if directly relevant. A genuinely helpful answer without a product plug performs better long-term.`;
  }

  cta = `If you mention ${product}: link as plain text — ${productUrl} — not markdown. Quora renders it as a hyperlink.`;

  return { hook, angle, cta };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const product = get('--product') ?? 'Your Product';
  const productUrl = get('--url') ?? '';
  const maxPerTopic = parseInt(get('--max') ?? '8', 10);
  const openBrowser = get('--no-browser') === undefined;

  // Topics can be comma-separated or a single --topic
  const topicsRaw = get('--topics') ?? get('--topic') ?? 'agency management tools';
  const topics = topicsRaw.split(',').map((t) => t.trim()).filter(Boolean);

  console.log(`Product: ${product}`);
  console.log(`Topics: ${topics.join(', ')}`);
  console.log(`Max results per topic: ${maxPerTopic}`);

  const browser = await chromium.launch({ headless: !openBrowser });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const allResults = [];

  for (const topic of topics) {
    const result = await searchQuora(page, topic, maxPerTopic);

    // Add answer guidance to each question
    result.questions = result.questions.map((q) => ({
      ...q,
      guidance: generateAnswerGuidance(q, product, productUrl),
    }));

    allResults.push(result);

    // Print to terminal
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Topic: ${topic}`);
    console.log(`Search URL: ${result.searchUrl}`);
    console.log(`Questions found: ${result.questions.length}\n`);

    result.questions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.title}`);
      console.log(`   URL: ${q.url}`);
      console.log(`   Hook: ${q.guidance.hook}`);
      console.log(`   Angle: ${q.guidance.angle}`);
      console.log('');
    });
  }

  // Open top questions in browser tabs (up to 5 total to avoid tab flood)
  if (openBrowser) {
    const topQuestions = allResults
      .flatMap((r) => r.questions)
      .slice(0, 5);

    console.log(`\nOpening top ${topQuestions.length} questions in browser...`);
    for (const q of topQuestions) {
      const tab = await context.newPage();
      await tab.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      console.log(`Opened: ${q.title.slice(0, 60)}...`);
    }
    console.log('\nBrowser tabs open. Answer manually — genuine helpful answers only.');
    console.log('Rule: give real value first. Mention your product only where genuinely relevant.');
    console.log('Press Ctrl+C when done.\n');
  }

  // Save results
  const outputPath = join(__dirname, 'quora-questions.json');
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        product,
        productUrl,
        generatedAt: new Date().toISOString(),
        topics: allResults,
      },
      null,
      2
    )
  );
  console.log(`Results saved: ${outputPath}`);

  if (openBrowser) {
    // Keep alive
    await new Promise(() => {});
  } else {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
