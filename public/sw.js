const CACHE = 'wb-v1'
const OFFLINE_URL = '/'

const PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  // Never intercept API calls or auth routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/login')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful navigation responses
        if (res.ok && e.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached ?? caches.match(OFFLINE_URL)))
  )
})
