/* Laundry Day Disaster service worker. Local cache only. No tracking. */
const CACHE = "ldd-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/audio.js",
  "./js/sprites.js",
  "./js/game.js",
  "./icons/icon-32.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/images/laundry-room.jpg",
  "./assets/images/hamper.png",
  "./assets/images/tammy-determined.png",
  "./assets/images/tammy-shocked.png",
  "./assets/images/tammy-laughing.png",
  "./assets/images/tammy-portrait-circle.png",
  "./assets/images/item-boxers.png",
  "./assets/images/item-briefs.png",
  "./assets/images/item-granny.png",
  "./assets/images/item-polka.png",
  "./assets/images/item-holey.png",
  "./assets/images/item-stink.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
