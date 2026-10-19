/* Offline support after one successful visit. Bump CACHE when the file list changes. */
const CACHE = "nastya-letter-v7-1";
const FILES = [
  "./assets/fonts/dela-gothic-one-cyrillic-400-normal.woff2",
  "./assets/fonts/dela-gothic-one-latin-400-normal.woff2",
  "./assets/fonts/golos-text-cyrillic-400-normal.woff2",
  "./assets/fonts/golos-text-cyrillic-500-normal.woff2",
  "./assets/fonts/golos-text-cyrillic-600-normal.woff2",
  "./assets/fonts/golos-text-latin-400-normal.woff2",
  "./assets/fonts/golos-text-latin-500-normal.woff2",
  "./assets/fonts/golos-text-latin-600-normal.woff2",
  "./assets/fonts/neucha-cyrillic-400-normal.woff2",
  "./assets/fonts/neucha-latin-400-normal.woff2",
  "./",
  "./index.html",
  "./styles.css",
  "./vault.js",
  "./inbox.js",
  "./vault.json",
  "./engine.js",
  "./share.js",
  "./persik.js",
  "./arcade-logic.js",
  "./arcade.js",
  "./sasha.html",
  "./sasha.js",
  "./sasha.css",
  "./script.js",
  "./manifest.webmanifest",
  "./assets/heart.svg",
  "./assets/icon-192.png",
];
self.addEventListener("install", (event) =>
  // One by one: the sealed site has vault.json in place of the texts and
  // photos, the local copy has no vault.json. A missing file is skipped.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(FILES.map((f) => cache.add(f).catch(() => {})))),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nastya-letter-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  // Network first keeps published content fresh; offline uses the saved copy.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.ok &&
          new URL(event.request.url).pathname.startsWith(
            new URL(self.registration.scope).pathname,
          )
        ) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(
        async () =>
          (await caches.match(event.request, { ignoreSearch: true })) ||
          (event.request.mode === "navigate"
            ? await caches.match("./index.html")
            : null) ||
          Response.error(),
      ),
  );
});
