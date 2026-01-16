// Service Worker для PWA
const CACHE_NAME = 'fitness-app-v2';
const urlsToCache = [
  './',
  './index-github.html',
  './app.js',
  './manifest.json'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов (стратегия Network First с Fallback на Cache)
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к Google Apps Script (всегда идем в сеть)
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Клонируем ответ, т.к. его можно использовать только раз
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, пробуем взять из кеша
        return caches.match(event.request);
      })
  );
});
