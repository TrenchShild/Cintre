/* Service worker de Cintre : rend l'app utilisable hors connexion.
   - Page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne ou réseau trop lent.
   - Icônes, polices, SDK : cache d'abord, rafraîchi en arrière-plan.
   - Météo et API Claude : jamais mises en cache (toujours en direct). */
const VERSION = "cintre-v9";
const SHELL = ["./", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
const CACHED_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function networkFirst(req, timeoutMs) {
  return new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match("./").then(r => r || caches.match(req));
    const timer = setTimeout(() => { if (!done) fallback().then(r => { if (r && !done) { done = true; resolve(r); } }); }, timeoutMs);
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./", copy)); }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(() => fallback().then(r => { if (!done) { done = true; clearTimeout(timer); resolve(r || Response.error()); } }));
  });
}
function staleWhileRevalidate(req) {
  return caches.open(VERSION).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate" && url.origin === location.origin) { e.respondWith(networkFirst(req, 3500)); return; }
  if (url.origin === location.origin || CACHED_HOSTS.includes(url.hostname)) e.respondWith(staleWhileRevalidate(req));
});
