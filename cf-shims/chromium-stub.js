// Stub for @sparticuz/chromium in Cloudflare Workers.
module.exports = {
  args: [],
  executablePath: () => Promise.reject(new Error('chromium unavailable in CF Workers')),
  font: () => undefined,
  setGraphicsMode: () => undefined,
  setHeadlessMode: () => undefined,
};
