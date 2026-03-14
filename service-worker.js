/* Bilderbox — service-worker.js v4 */
const CACHE = 'bilderbox-v4'

/* static assets only — no HTML, so updates always come through */
const STATIC = [
  '/css/style.css',
  '/css/pages.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = e.request.url

  /* always network-first for CDNs */
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic') || url.includes('cdn.jsdelivr')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
    return
  }

  /* network-first for all HTML — ensures page updates always land */
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  /* cache-first for static assets (CSS, JS, images) */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
    })
  )
})
