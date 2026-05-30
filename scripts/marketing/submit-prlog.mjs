#!/usr/bin/env node
/**
 * submit-prlog.mjs
 * Automates free press release submission to PRLog.org
 *
 * Usage:
 *   node submit-prlog.mjs --title "Your Title" --body "Press release body..." \
 *     --email you@example.com --password yourpassword \
 *     --website https://yoursite.com --city "Twin Falls" --state ID
 *
 * Or import the function:
 *   import { submitPRLog } from './submit-prlog.mjs';
 *   await submitPRLog({ title, body, email, password, website, city, state, category });
 *
 * Flow:
 *   1. Log in (or register) at prlog.org
 *   2. Navigate to submit form
 *   3. Fill title, body, category, contact info
 *   4. Submit and capture confirmation URL
 *
 * Notes:
 *   - PRLog requires a free account before submitting
 *   - Rate limit: 1 press release per day per account on free tier
 *   - Verification email required on first submission
 *   - CAPTCHA may appear — script will pause and notify if detected
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PRLOG_BASE = 'https://www.prlog.org';
const SUBMIT_URL = `${PRLOG_BASE}/submit-free-press-release.html`;
const LOGIN_URL = `${PRLOG_BASE}/login.html`;

// PRLog category IDs (from their dropdown)
const CATEGORIES = {
  technology: '14',
  software: '13',
  internet: '8',
  business: '1',
  education: '5',
  health: '7',
  finance: '6',
  marketing: '10',
  other: '18',
};

/**
 * Submit a press release to PRLog.
 * @param {object} opts
 * @param {string} opts.title         - PR headline (max 100 chars)
 * @param {string} opts.body          - Full press release text (min 500 words recommended)
 * @param {string} opts.email         - PRLog account email
 * @param {string} opts.password      - PRLog account password
 * @param {string} [opts.website]     - URL to link in PR (optional)
 * @param {string} [opts.city]        - City for geographic targeting
 * @param {string} [opts.state]       - State abbreviation (e.g. ID)
 * @param {string} [opts.category]    - Category key from CATEGORIES object (default: 'technology')
 * @param {string} [opts.contactName] - Contact person name
 * @param {string} [opts.contactPhone]- Contact phone
 * @param {boolean} [opts.headless]   - Run headless (default: false so you can handle CAPTCHA)
 * @param {string} [opts.screenshotDir] - Directory to save confirmation screenshot
 * @returns {Promise<{success: boolean, confirmationUrl: string, message: string}>}
 */
export async function submitPRLog(opts = {}) {
  const {
    title,
    body,
    email,
    password,
    website = '',
    city = '',
    state = '',
    category = 'technology',
    contactName = '',
    contactPhone = '',
    headless = false,
    screenshotDir = './screenshots',
  } = opts;

  if (!title || !body || !email || !password) {
    throw new Error('Required: title, body, email, password');
  }
  if (title.length > 100) {
    throw new Error(`Title too long: ${title.length} chars (max 100)`);
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Step 1 — Log in
    console.log('Navigating to PRLog login...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: `${screenshotDir}/prlog-01-login.png` });

    // Fill login form
    const emailInput = await page.$('input[name="email"], input[type="email"]');
    const passInput = await page.$('input[name="password"], input[type="password"]');

    if (!emailInput || !passInput) {
      throw new Error('Login form not found — PRLog may have changed their layout');
    }

    await emailInput.fill(email);
    await passInput.fill(password);

    // Submit login
    const loginBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    }

    await page.screenshot({ path: `${screenshotDir}/prlog-02-after-login.png` });

    // Check if login succeeded
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      throw new Error('Login failed — check email/password. Screenshot: prlog-02-after-login.png');
    }
    console.log('Login succeeded.');

    // Step 2 — Navigate to submit form
    await page.goto(SUBMIT_URL, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: `${screenshotDir}/prlog-03-submit-form.png` });

    // Step 3 — Fill the form
    // Title
    const titleInput = await page.$('input[name="title"], input[name="headline"]');
    if (titleInput) {
      await titleInput.fill(title);
    }

    // Body / content
    const bodyInput = await page.$('textarea[name="body"], textarea[name="content"], textarea');
    if (bodyInput) {
      await bodyInput.fill(body);
    }

    // Website URL
    if (website) {
      const urlInput = await page.$('input[name="url"], input[name="website"]');
      if (urlInput) await urlInput.fill(website);
    }

    // Category select
    const catSelect = await page.$('select[name="category_id"], select[name="category"]');
    if (catSelect) {
      const catId = CATEGORIES[category] ?? CATEGORIES.technology;
      await catSelect.selectOption({ value: catId });
    }

    // City / state
    if (city) {
      const cityInput = await page.$('input[name="city"]');
      if (cityInput) await cityInput.fill(city);
    }
    if (state) {
      const stateInput = await page.$('input[name="state"], select[name="state"]');
      if (stateInput) {
        if ((await stateInput.evaluate((el) => el.tagName)) === 'SELECT') {
          await stateInput.selectOption({ value: state });
        } else {
          await stateInput.fill(state);
        }
      }
    }

    // Contact info
    if (contactName) {
      const nameInput = await page.$('input[name="contact_name"], input[name="name"]');
      if (nameInput) await nameInput.fill(contactName);
    }
    if (contactPhone) {
      const phoneInput = await page.$('input[name="phone"], input[name="contact_phone"]');
      if (phoneInput) await phoneInput.fill(contactPhone);
    }

    await page.screenshot({ path: `${screenshotDir}/prlog-04-filled-form.png` });

    // Check for CAPTCHA
    const captcha = await page.$('iframe[src*="recaptcha"], .g-recaptcha, #captcha');
    if (captcha) {
      console.warn('CAPTCHA detected — script paused. Solve manually in the browser window, then press Enter.');
      if (!headless) {
        // Wait up to 2 minutes for manual CAPTCHA solving
        await page.waitForTimeout(120000);
      } else {
        throw new Error('CAPTCHA detected but running headless — set headless: false to solve manually');
      }
    }

    // Step 4 — Submit
    const submitBtn = await page.$('input[type="submit"][value*="Submit"], button[type="submit"]');
    if (!submitBtn) {
      throw new Error('Submit button not found — form structure may have changed');
    }

    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

    const confirmationUrl = page.url();
    await page.screenshot({ path: `${screenshotDir}/prlog-05-confirmation.png` });

    const isSuccess =
      confirmationUrl.includes('success') ||
      confirmationUrl.includes('confirmation') ||
      !(await page.$('.error, .alert-danger'));

    console.log(isSuccess ? 'Press release submitted successfully!' : 'Submission may have failed — check screenshot.');

    return {
      success: isSuccess,
      confirmationUrl,
      message: isSuccess
        ? `Press release submitted. Confirmation: ${confirmationUrl}`
        : 'Submission uncertain — review prlog-05-confirmation.png',
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

// CLI runner
if (process.argv[1] === fileURLToPath(new URL(import.meta.url))) {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const opts = {
    title: get('--title'),
    body: get('--body'),
    email: get('--email'),
    password: get('--password'),
    website: get('--website'),
    city: get('--city'),
    state: get('--state'),
    category: get('--category') ?? 'technology',
    contactName: get('--contact-name'),
    contactPhone: get('--contact-phone'),
    headless: get('--headless') === 'true',
  };

  if (!opts.title || !opts.body || !opts.email || !opts.password) {
    console.error('Usage: node submit-prlog.mjs --title "..." --body "..." --email "..." --password "..."');
    process.exit(1);
  }

  submitPRLog(opts)
    .then((result) => {
      console.log('\nResult:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
