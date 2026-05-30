#!/usr/bin/env node
/**
 * submit-directories.mjs
 * Automates free business listing submission to:
 *   - Hotfrog (hotfrog.com/add)
 *   - Manta (manta.com — requires account)
 *   - EZLocal (deprecated free form — opens manual fallback)
 *   - Bing Places (bing.com/forbusiness — opens browser for Microsoft login)
 *
 * Usage:
 *   node submit-directories.mjs --name "Business Name" --phone "208-555-1234" \
 *     --email you@example.com --website https://yoursite.com \
 *     --address "123 Main St" --city "Twin Falls" --state ID --zip 83301 \
 *     --category "Auto Repair" --description "We fix cars..."
 *
 * Or run a single directory:
 *   node submit-directories.mjs --directory hotfrog [options above]
 *
 * Available values for --directory: hotfrog | manta | ezlocal | bingplaces | all
 * Default: all
 *
 * Notes on each directory (verified 2026-05-30):
 *   hotfrog   — /add URL active, cookie consent wall, form accessible after consent
 *   manta     — /add_business is 404; opens account creation page, manual completion needed
 *   ezlocal   — /free-listing URL shows search page (not a form); opens homepage for manual use
 *   bingplaces — Active at bing.com/forbusiness, requires Microsoft login (manual)
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── Hotfrog ────────────────────────────────────────────────────────────────
/**
 * Submit a free listing to Hotfrog.
 * Hotfrog requires account creation or social login. This script fills the
 * registration + listing form where possible, then pauses for manual completion.
 */
async function submitHotfrog(page, biz) {
  console.log('\n[Hotfrog] Starting...');
  await page.goto('https://www.hotfrog.com/add', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Handle cookie consent if present
  const acceptBtn = await page.$('button:has-text("Accept all"), button:has-text("Accept")');
  if (acceptBtn) {
    await acceptBtn.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/hotfrog-01-add.png` });
  console.log('[Hotfrog] Navigated to /add. Screenshot: hotfrog-01-add.png');

  // Try to fill business name
  const bizNameInput = await page.$('input[name="name"], input[placeholder*="business"], input[placeholder*="Business"]');
  if (bizNameInput) {
    await bizNameInput.fill(biz.name);
    console.log('[Hotfrog] Filled business name');
  }

  const phoneInput = await page.$('input[name="phone"], input[type="tel"]');
  if (phoneInput) await phoneInput.fill(biz.phone ?? '');

  const websiteInput = await page.$('input[name="website"], input[type="url"]');
  if (websiteInput) await websiteInput.fill(biz.website ?? '');

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/hotfrog-02-filled.png` });
  console.log('[Hotfrog] Form filled as much as possible. Manual completion may be needed.');
  console.log('[Hotfrog] Browser window open at: https://www.hotfrog.com/add');

  return { directory: 'hotfrog', url: page.url(), status: 'partial_auto' };
}

// ─── Manta ──────────────────────────────────────────────────────────────────
/**
 * Manta's /add_business URL is now 404. Opens account creation page.
 * User must complete registration and listing manually.
 */
async function submitManta(page, biz) {
  console.log('\n[Manta] Starting...');
  // /add_business is dead — navigate to account creation
  await page.goto('https://www.manta.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/manta-01-home.png` });
  console.log('[Manta] Opened homepage. The /add_business path is 404 as of 2026-05-30.');
  console.log('[Manta] Manual step: create a free account at manta.com, then add your business listing.');
  console.log('[Manta] Screenshot: manta-01-home.png');

  return { directory: 'manta', url: page.url(), status: 'manual_required', note: '/add_business URL is dead — use account creation flow' };
}

// ─── EZLocal ────────────────────────────────────────────────────────────────
/**
 * EZLocal's free listing form no longer has a public direct URL.
 * Opens their homepage — user calls to request a free listing.
 */
async function submitEZLocal(page, biz) {
  console.log('\n[EZLocal] Starting...');
  await page.goto('https://www.ezlocal.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/ezlocal-01-home.png` });
  console.log('[EZLocal] Opened homepage. The /free-listing path returns a search results page.');
  console.log('[EZLocal] Manual step: call EZLocal at 1-888-399-9562 or email to request a free listing.');
  console.log('[EZLocal] Screenshot: ezlocal-01-home.png');

  return {
    directory: 'ezlocal',
    url: page.url(),
    status: 'manual_required',
    note: '/free-listing URL is deprecated. EZLocal now focuses on paid services; free listings require phone/email contact.',
  };
}

// ─── Bing Places ────────────────────────────────────────────────────────────
/**
 * Bing Places requires a Microsoft account.
 * Opens the portal — user completes Microsoft login and adds listing.
 */
async function submitBingPlaces(page, biz) {
  console.log('\n[Bing Places] Starting...');
  await page.goto('https://www.bing.com/forbusiness/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/bingplaces-01-portal.png` });
  console.log('[Bing Places] Opened portal. Requires Microsoft account login.');
  console.log('[Bing Places] Manual step: click "Get Started" and sign in with your Microsoft account.');
  console.log('[Bing Places] Screenshot: bingplaces-01-portal.png');

  // Try to find and click the "Get started" / "Add my business" button
  const ctaBtn = await page.$(
    'a:has-text("Get started"), a:has-text("Add your business"), button:has-text("Get started")'
  );
  if (ctaBtn) {
    console.log('[Bing Places] Found CTA button — clicking...');
    await ctaBtn.click();
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/bingplaces-02-signin.png` });
    console.log('[Bing Places] Navigated to sign-in. Screenshot: bingplaces-02-signin.png');
  }

  return {
    directory: 'bingplaces',
    url: page.url(),
    status: 'manual_required',
    note: 'Microsoft account required. Free and high-value for local SEO.',
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const biz = {
    name: get('--name') ?? 'My Business',
    phone: get('--phone') ?? '',
    email: get('--email') ?? '',
    website: get('--website') ?? '',
    address: get('--address') ?? '',
    city: get('--city') ?? '',
    state: get('--state') ?? '',
    zip: get('--zip') ?? '',
    category: get('--category') ?? '',
    description: get('--description') ?? '',
  };

  const targetDir = get('--directory') ?? 'all';
  const headless = get('--headless') !== 'false'; // default headless=true; pass --headless false to see browser

  console.log(`Business: ${biz.name}`);
  console.log(`Target: ${targetDir}`);
  console.log(`Headless: ${headless}\n`);

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const results = [];

  try {
    if (targetDir === 'hotfrog' || targetDir === 'all') {
      results.push(await submitHotfrog(page, biz));
    }
    if (targetDir === 'manta' || targetDir === 'all') {
      results.push(await submitManta(page, biz));
    }
    if (targetDir === 'ezlocal' || targetDir === 'all') {
      results.push(await submitEZLocal(page, biz));
    }
    if (targetDir === 'bingplaces' || targetDir === 'all') {
      results.push(await submitBingPlaces(page, biz));
    }
  } finally {
    // Keep browser open if non-headless so user can complete manual steps
    if (headless) {
      await context.close();
      await browser.close();
    } else {
      console.log('\nBrowser left open for manual completion. Close it when done.');
      // Give user 10 minutes
      await new Promise((r) => setTimeout(r, 600000));
      await context.close();
      await browser.close();
    }
  }

  console.log('\n=== Results ===');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
