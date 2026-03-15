/* Bilderbox service-worker.js v7 */
const CACHE = 'bilderbox-v9'
const STATIC = ['/css/style.css','/manifest.json','/icons/icon-192.png','/icons/icon-512.png','/icons/icon.svg']

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())) })

self.addEventListener('fetch', e => {
  const url = e.request.url
  if (url.includes('fonts.googleapis')||url.includes('fonts.gstatic')||url.includes('cdn.jsdelivr')) {
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))); return
  }
  if (e.request.headers.get('accept')?.includes('text/html') || url.endsWith('.js')) {
    e.respondWith(fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return res}).catch(()=>caches.match(e.request))); return
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return res})))
})
