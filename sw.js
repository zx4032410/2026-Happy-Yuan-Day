const CACHE_NAME = 'yuan-day-v5';  // ✨ 升級版本以修復 safe-area 問題

// 指定要快取的檔案
// 包含 CSS, JS, 圖片與 HTML
// 注意：firebase-app.js 等外部 CDN 腳本通常建議讓瀏覽器自行快取，或使用 runtime caching
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/variables.css',
  './styles/base.css',
  './styles/buttons.css',
  './styles/game-ui.css',
  './styles/modals.css',
  './styles/milestones.css',
  './styles/loading.css',
  './styles/animations.css',
  './js/lang.js',
  './js/questions.js',
  './js/game-config.js',
  './js/managers/share-manager.js',
  './js/managers/database-manager.js',
  './js/managers/audio-manager.js',
  './js/managers/ui-manager.js',
  './js/managers/effect-manager.js',
  './js/managers/input-manager.js',
  './js/managers/item-manager.js',
  './js/player.js',
  './js/game.js',
  './js/offline-handler.js',
  // Images
  './images/sharecard-icon.png',
  './images/favicon.ico',
  './images/item-alarm-clock.png',
  './images/item-bear-cookie.png',
  './images/item-burnt-cookie.png',
  './images/item-guitar.png',
  './images/item-lightstick.png',
  './images/item-white-heart.png',
  './images/question_icon.png',
  './images/xiao-yuan-bao-idle-1.png',
  './images/xiao-yuan-bao-idle-2.png',
  './images/xiao-yuan-bao-idle-3.png',
  './images/xiao-yuan-bao-idle-4.png',
  './images/xiao-yuan-bao-idle-5.png',
  './images/xiao-yuan-bao-idle-6.png',
  './images/xiao-yuan-bao-lose.png',
  './images/xiao-yuan-bao-win.png',
  // Audio
  './audio/answer-correct.mp3',
  './audio/answer-incorrect.mp3',
  './audio/bgm.mp3',
  './audio/bgm-fever.m4a',
  './audio/collect-negative.mp3',
  './audio/collect-positive.mp3',
  './audio/collect-question.mp3',
  './audio/collect-special.mp3',
  './audio/game-over.mp3',
  './audio/game-start.mp3',
  './audio/Happy Birthday_8bit.mp3'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // 使用 Promise.allSettled 逐一快取，避免單一檔案失敗導致全部失敗
        return Promise.allSettled(
          URLS_TO_CACHE.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache: ${url}`, err);
            })
          )
        ).then((results) => {
          const failed = results.filter((r) => r.status === 'rejected');
          if (failed.length > 0) {
            console.warn(`${failed.length} files failed to cache`);
          }
          console.log(`Cached ${results.length - failed.length}/${results.length} files`);
        });
      })
      .catch((err) => {
        console.error('Cache open failed:', err);
      })
  );
  // 強制立即啟用新的 Service Worker
  self.skipWaiting();
});

// 啟動 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 讓 Service Worker 立即接管頁面
  return self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  // 對於跨網域請求 (如 Firebase)，直接回傳，不使用這個 Cache 策略，
  // 或者可以實作 Network First。這裡採用簡單的 Stale-While-Revalidate 或是 Cache First。
  // 為了確保遊戲更新，我們使用 Stale-While-Revalidate (優先使用快取，背景更新)
  
  // 排除非 GET 請求
  if (event.request.method !== 'GET') return;

  // 過濾掉不支援快取的協議 (chrome-extension://, moz-extension:// 等)
  const url = new URL(event.request.url);
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return; // 直接略過，不快取、不攔截
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果快取有，先回傳快取
        const fetchPromise = fetch(event.request).then(
          (networkResponse) => {
            // 檢查回應是否有效
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 更新快取
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((e) => {
                // 快取失敗時記錄警告，避免 unhandled rejection
                console.warn('Cache put failed:', e);
              });

            return networkResponse;
          }
        );

        // 如果有快取，回傳快取，但同時觸發 fetch (Stale-while-revalidate)
        // 注意：標準 SWR 實作較複雜，這裡簡化為 "Cache First, falling back to network"
        // 若要真正做到 SWR 需要配合 Client 端更新通知，為避免複雜，
        // 這裡改用 Cache First 策略 (若快取有就用，沒有才去抓)
        // 但為了要能更新遊戲，我們可以在 install 階段就全抓新的。
        
        return cachedResponse || fetchPromise;
      })
  );
});
