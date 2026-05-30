#!/usr/bin/env node
/**
 * test-channels.mjs
 * Tests all free marketing channel URLs for accessibility and form presence.
 * Run: node test-channels.mjs
 * Outputs: JSON report + saves screenshots to ./screenshots/
 *
 * Requires: playwright (npm install playwright)
 * Run once: npx playwright install chromium
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Channels to test — corrected URLs from live verification (2026-05-30)
const CHANNELS = [
  {
    name: 'prlog',
    label: 'PRLog Press Release',
    url: 'https://www.prlog.org/submit-free-press-release.html',
    formSelectors: ['form', 'input[name="title"]', 'textarea', 'input[type="text"]'],
    notes: 'Corrected URL — old /post-press-release.html returns 404. Requires free account creation before submitting.',
  },
  {
    name: 'manta',
    label: 'Manta Business Directory',
    url: 'https://www.manta.com/add_business',
    formSelectors: ['form', 'input[type="text"]', 'input[name="company"]'],
    notes: 'Old /add_business URL is 404. Manta now requires account login before listing. Direct add URL deprecated.',
  },
  {
    name: 'hotfrog',
    label: 'Hotfrog Business Directory',
    url: 'https://www.hotfrog.com/add',
    formSelectors: ['form', 'input[type="text"]', 'input[name="business"]'],
    notes: 'Corrected URL — /AddBusiness.aspx returns 404. Active site with cookie consent wall.',
  },
  {
    name: 'ezlocal',
    label: 'EZLocal Free Listing',
    url: 'https://www.ezlocal.com/free-listing',
    formSelectors: ['form', 'input[type="text"]', 'input[name="name"]'],
    notes: 'URL loads as search results page — no direct free listing form. EZLocal pivoted to paid services.',
  },
  {
    name: 'bingplaces',
    label: 'Bing Places for Business',
    url: 'https://www.bing.com/forbusiness/',
    formSelectors: ['form', 'input[type="text"]', 'button[type="submit"]'],
    notes: 'bingplaces.com redirects here. Requires Microsoft account. Free listing portal active.',
  },
  {
    name: 'producthunt',
    label: 'Product Hunt',
    url: 'https://www.producthunt.com/posts/new',
    formSelectors: ['form', 'input[name="name"]', 'input[type="url"]'],
    notes: 'Redirects to login before submission form. Requires free account. Active and high-value for SaaS/tools.',
  },
  {
    name: 'indiehackers',
    label: 'Indie Hackers Products',
    url: 'https://www.indiehackers.com/products',
    formSelectors: ['a[href*="new"]', 'button', 'form'],
    notes: 'Products listing page accessible. Submission requires free account. Good for indie SaaS.',
  },
  {
    name: 'betalist',
    label: 'BetaList',
    url: 'https://betalist.com/submit',
    formSelectors: ['form', 'input[type="url"]', 'input[type="text"]'],
    notes: 'Redirects to sign_in. Free submission available after account creation. Startup-focused.',
  },
  {
    name: 'quora',
    label: 'Quora',
    url: 'https://www.quora.com',
    formSelectors: ['form', 'input[type="text"]', '[role="searchbox"]'],
    notes: 'Accessible homepage. Search and Q&A available. Manual answering channel — not automatable.',
  },
];

async function testChannel(browser, channel) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const result = {
    channel: channel.name,
    label: channel.label,
    url: channel.url,
    accessible: false,
    finalUrl: channel.url,
    httpStatus: null,
    hasForm: false,
    formElementsFound: [],
    pageTitle: '',
    screenshot_path: join(SCREENSHOTS_DIR, `channel-test-${channel.name}.png`),
    notes: channel.notes,
    testedAt: new Date().toISOString(),
  };

  try {
    const response = await page.goto(channel.url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    result.httpStatus = response?.status() ?? null;
    result.finalUrl = page.url();
    result.pageTitle = await page.title();

    // Consider accessible if status < 400 OR if we got redirected to a valid page
    const status = result.httpStatus ?? 0;
    result.accessible = status === 0 || (status >= 200 && status < 400);

    // Check for 404 in title or page content
    const title = result.pageTitle.toLowerCase();
    if (title.includes('404') || title.includes('not found') || title.includes('page not found')) {
      result.accessible = false;
      result.notes = `Page returns 404. ${channel.notes}`;
    }

    // Check for form elements
    for (const selector of channel.formSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          result.formElementsFound.push(selector);
        }
      } catch {
        // selector may not be supported — skip
      }
    }
    result.hasForm = result.formElementsFound.length > 0;

    // Wait briefly for JS rendering
    await page.waitForTimeout(1500);

    // Take screenshot
    await page.screenshot({
      path: result.screenshot_path,
      type: 'png',
    });
  } catch (err) {
    result.accessible = false;
    result.notes = `Error during test: ${err.message}. ${channel.notes}`;
  } finally {
    await context.close();
  }

  return result;
}

async function main() {
  console.log('Starting channel tests...\n');
  const browser = await chromium.launch({ headless: true });

  const results = [];
  for (const channel of CHANNELS) {
    process.stdout.write(`Testing ${channel.label}... `);
    const result = await testChannel(browser, channel);
    results.push(result);
    const status = result.accessible
      ? `PASS (form: ${result.hasForm ? 'YES' : 'NO'})`
      : 'FAIL (404/error)';
    console.log(status);
  }

  await browser.close();

  // Write report
  const reportPath = join(__dirname, 'channel-report.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport written to: ${reportPath}`);

  // Summary
  const passing = results.filter((r) => r.accessible).length;
  const withForms = results.filter((r) => r.hasForm).length;
  console.log(`\nSummary: ${passing}/${results.length} accessible, ${withForms} with detectable forms`);

  return results;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
