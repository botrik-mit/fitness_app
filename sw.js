// Service Worker для PWA
// Минимальная версия - только install + activate
const CACHE_NAME = 'fitness-app-v1';

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker');
  self.skipWaiting(); // Немедленная активация
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker');
  event.waitUntil(
    // Очистка старых кешей
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Захватываем все открытые вкладки
      return self.clients.claim();
    })
  );
});

// НЕ добавляем fetch handler - все запросы идут напрямую
// Данные управляются Google Apps Script
