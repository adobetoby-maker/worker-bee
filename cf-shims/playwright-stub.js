// Stub for playwright-core / playwright in Cloudflare Workers.
// These packages require Node.js native binaries and cannot run in CF Workers.
// API routes that use playwright have try/catch and return 501 on import failure.
module.exports = {
  chromium: null,
  firefox: null,
  webkit: null,
  devices: {},
  errors: {},
  selectors: {},
  request: { newContext: () => Promise.reject(new Error('playwright unavailable in CF Workers')) },
};
