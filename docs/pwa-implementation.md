# PWA 漸進式網頁應用實施細節

## 概述

本文件記錄了為專案加入 PWA (Progressive Web App) 支援的實作細節。透過 PWA 技術，本專案現在支援安裝到裝置桌面，並具備基本的離線瀏覽能力。

**實作日期**: 2025-12-08
**核心功能**: 可安裝性 (Installability)、離線支援 (Offline Support)
**主要檔案**: `manifest.json`, `sw.js`, `index.html`

---

## 檔案結構

新增及修改的檔案如下：

```
root/
├── manifest.json      # [新增] 應用程式清單，定義安裝資訊
├── sw.js             # [新增] Service Worker，處理快取與離線邏輯
└── index.html        # [修改] 註冊 PWA 並加入 meta 標籤
```

---

## 實作詳情

### 1. `manifest.json`

**職責**: 定義應用程式在安裝後的名稱、圖示與外觀行為。

**關鍵設定**:

- **Name**: `小媛寶生日應援`
- **Short Name**: `媛氣加分` (顯示在主畫面)
- **Display**: `standalone` (隱藏瀏覽器網址列，類原生體驗)
- **Icons**: 使用 `images/sharecard-icon.png` (已裁剪為正方形以符合 PWA 規範)
- **Theme Color**: `#f72585` (配合品牌色)

### 2. `sw.js` (Service Worker)

**職責**: 攔截網路請求，實作離線快取策略。

**快取策略**: **Cache First (優先使用快取)**

- 首次載入時，Service Worker 會在 `install` 階段下載並快取所有關鍵資源。
- 後續請求會優先從快取讀取，若快取無資料才請求網路。
- 在 `activate` 階段會清理舊版本的快取 (透過 `CACHE_NAME` 版本號控制)。

**快取內容**:

- 核心頁面: `index.html`
- 樣式表: `styles/*.css`
- 程式碼: `js/*.js`
- 媒體資源: 關鍵圖片與 favicon

**程式碼片段**:

```javascript
const CACHE_NAME = "yuan-day-v1"; // 快取版本號，更新時需修改此處

self.addEventListener("fetch", (event) => {
  // 簡單的 Cache First 策略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 有快取就用快取，沒有就上網抓
      return cachedResponse || fetch(event.request);
    })
  );
});
```

### 3. `index.html` 修改

**職責**: 連結 PWA 資源並註冊 Service Worker。

**新增標籤**:

```html
<!-- Manifest 連結 -->
<link rel="manifest" href="manifest.json" />

<!-- iOS 支援 (iOS 不完全支援 manifest，需額外 meta) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
<link rel="apple-touch-icon" href="images/sharecard-icon.png" />
```

**註冊腳本**:
在 `body` 底部加入腳本，檢查瀏覽器是否支援 `serviceWorker` 並執行註冊。

---

## 驗證方式

1. **瀏覽器開發者工具 (DevTools)**:

   - **Application > Manifest**: 確認無錯誤，圖示與名稱正確載入。
   - **Application > Service Workers**: 確認 Status 為 `Activated` 且 `Running`。
   - **Lighthouse**: 可執行 PWA 評分測試。

2. **實際安裝測試**:

   - **Desktop (Chrome/Edge)**: 網址列右側出現安裝圖示。
   - **Mobile (Android)**: 瀏覽器選單出現 "加到主畫面" 或自動提示安裝。
   - **Mobile (iOS)**: 透過 "分享" > "加入主畫面" 手動安裝。

3. **離線測試**:
   - 關閉網路或在 DevTools > Network 切換為 `Offline`。
   - 重新整理頁面，確認遊戲仍可正常載入與遊玩。

---

## 維護與更新建議

1. **更新專案內容時**:

   - 若有修改 CSS 或 JS 程式碼，**務必更新 `sw.js` 中的 `CACHE_NAME`** (例如從 `v1` 改為 `v2`)。
   - 這會觸發 Service Worker 的更新流程，確保使用者下載到最新的檔案，避免看到舊的快取內容。

2. **圖示優化**:

   - 目前使用長方形圖卡作為 Icon。建議未來製作標準的 192x192 與 512x512 **正方形** PNG 圖示，以避免在部分裝置上變形。

3. **Firebase 注意事項**:
   - 目前的快取策略主要針對靜態資源。Firebase Firestore 的資料存取由 Firebase SDK 內建的離線功能處理，與 Service Worker 快取是分開的。
