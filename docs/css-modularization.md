# CSS 模組化重構

## 概述
將原本 2337 行的單一 `style.css` 檔案拆分成 8 個職責清晰的模組化 CSS 檔案，大幅提升程式碼的可讀性、可維護性和協作效率。

**重構日期**: 2025-11-22  
**原始檔案大小**: 2337 行 / 36KB  
**模組化後**: 8 個檔案 / 平均每檔 ~180 行

---

## 模組結構

所有 CSS 模組位於 `styles/` 目錄，按照功能和載入順序組織：

```
styles/
├── variables.css      # CSS 變數定義
├── base.css          # 基礎樣式
├── buttons.css       # 按鈕樣式系統
├── game-ui.css       # 遊戲介面組件
├── modals.css        # 彈窗樣式系統
├── milestones.css    # 里程碑相關樣式
├── loading.css       # 載入畫面樣式
└── animations.css    # 動畫效果
```

---

## 模組定義

### 1. `variables.css` (80 行)
**職責**: CSS 變數定義與設計系統

**包含內容**:
- 顏色系統 (主色、輔色、強調色)
- 間距系統 (`--spacing-xs` ~ `--spacing-xxl`)
- 字體大小系統 (`--font-size-xs` ~ `--font-size-xxl`)
- 圓角系統 (`--border-radius-sm` ~ `--border-radius-full`)
- 陰影系統 (`--shadow-sm` ~ `--shadow-glow`)
- 過渡動畫時間 (`--transition-fast` ~ `--transition-slow`)
- Z-index 層級管理
- 行動裝置變數覆蓋 (RWD)

**使用範例**:
```css
.my-button {
    padding: var(--spacing-md);
    background-color: var(--color-accent-blue);
    border-radius: var(--border-radius-md);
}
```

---

### 2. `base.css` (90 行)
**職責**: 全域基礎樣式與 reset

**包含內容**:
- `body` 基礎設定 (字體、背景、佈局)
- 全域文字描邊效果
- 標題樣式加粗
- 按鈕基礎互動效果
- `.hidden` 共用類別

**設計要點**:
- 使用 `background-attachment: fixed` 固定背景
- 統一的文字陰影描邊效果
- 響應式間距設定

---

### 3. `buttons.css` (230 行)
**職責**: 完整的按鈕樣式系統

**包含內容**:
- 基礎按鈕樣式 (`.btn`)
- 按鈕顏色變體:
  - `.btn-primary` (粉紅色)
  - `.btn-secondary` (藍色)
  - `.btn-success` (綠色)
  - `.btn-info` (青色)
  - `.btn-warning` (黃色)
  - `.btn-danger` (紅色)
  - `.btn-gray` (灰色)
- `.start-button-style` 開始按鈕樣式
- 問題選項按鈕
- 答題回饋樣式 (`.correct-answer` / `.incorrect-answer`)
- 分享格式按鈕 (`.format-btn`)
- 分享操作按鈕 (`.share-btn`)
- 行動裝置按鈕優化

**使用範例**:
```html
<button class="btn btn-primary">確認</button>
<button class="start-button-style">開始遊戲</button>
```

---

### 4. `game-ui.css` (330 行)
**職責**: 遊戲核心介面組件

**包含內容**:
- `#game-container` 遊戲主容器
- `#info-bar` 頂部資訊列
- `#fever-timer-bar` Fever Time 倒數計時條
- `#game-canvas` 遊戲畫布
- `#mobile-controls` 行動裝置虛擬按鈕
- `.control-button` 左右移動按鈕
- `#mute-button` 靜音按鈕
- `#lang-switcher-area` 語言切換器
- `#score-change` 分數變化顯示
- `#global-ui-container` 全域 UI 容器
- 行動裝置響應式優化

**設計要點**:
- 資訊列使用 `position: relative` 支援 Fever Timer 進度條
- 虛擬按鈕使用 `pointer-events` 控制互動
- 桌機版自動隱藏虛擬按鈕 (`@media min-width: 768px`)

---

### 5. `modals.css` (340 行)
**職責**: 彈窗系統樣式

**包含內容**:
- `.modal-overlay` 共用彈窗遮罩
- `.modal-content` 共用彈窗內容
- `#birthday-modal-content` 生日彈窗 (特殊白底設計)
- `#endgame-stats` 結算統計區
- `#endgame-screen-ui` 結算畫面
- `#question-area` 問題區域
- `#import-area` / `#import-ui-area` 匯入進度 UI
- `#ig-input` IG 帳號輸入框
- 行動裝置彈窗優化 (垂直置中、最大高度)

**設計要點**:
- 使用 `z-index` 變數管理層級
- 生日彈窗使用 `text-shadow: none !important` 移除全域描邊
- 彈窗內容支援垂直滾動 (`overflow-y: auto`)

---

### 6. `milestones.css` (220 行)
**職責**: 個人與全體里程碑樣式

**包含內容**:
- `#milestone-modal-content` 個人里程碑彈窗
- `.milestone-score-header` 分數顯示區
- `.milestone-ig-display` IG 帳號顯示區
- `.milestone-tiers-list` 階級列表
- `.milestone-tier-row` 單一階級行 (含 `.disabled` 狀態)
- `.milestone-tier-action` 領取按鈕 (含 `.claimed` 狀態)
- `#global-milestone-modal-content` 全體里程碑彈窗
- `.milestone-progress-bar-container` 進度條容器
- `.global-milestone-buttons` 按鈕群組
- 行動裝置優化 (按鈕縱向排列)

**設計要點**:
- 階級行使用 `flexbox` 左右分佈
- 進度條使用絕對定位 + 百分比文字疊加
- 按鈕狀態視覺化 (可領取=黃色 / 已領取=灰色 / 未達成=半透明)

---

### 7. `loading.css` (160 行)
**職責**: 載入過程視覺回饋

**包含內容**:
- `.skeleton-layer` 骨架屏容器
- `.skeleton-block` 骨架屏區塊
- `@keyframes skeleton-pulse` 脈搏動畫
- `.skeleton-header` / `.skeleton-canvas` / `.skeleton-controls` 骨架屏佈局
- `.loading-overlay` 載入遮罩 (半透明 + 模糊背景)
- `.loading-content` 載入內容容器
- `.loading-progress-container` 進度條容器
- `.loading-hint` / `.loading-time` 提示文字

**設計要點**:
- 骨架屏使用 `pointer-events: none` 防止互動
- Loading Overlay 使用 `backdrop-filter: blur(8px)` 背景模糊
- 進度條使用 `transition` 平滑更新

---

### 8. `animations.css` (110 行)
**職責**: 動畫與視覺特效

**包含內容**:
- `@keyframes backgroundPulse` Fever Time 背景閃爍
- `.fever-background` Fever Time 背景類別
- `#fever-effect-overlay` 視覺特效層
- `.speed-lines` 漫畫速度線效果
- `@keyframes rotateLines` 速度線旋轉動畫
- `.vignette` 暗角聚焦效果
- `@keyframes vignettePulse` 暗角脈搏動畫

**設計要點**:
- 特效層使用 `pointer-events: none` 不擋住遊戲操作
- 速度線使用 `repeating-conic-gradient` 製作放射狀效果
- 暗角使用 `radial-gradient` + CSS 變數 `--player-x` 動態定位
- 使用 `mix-blend-mode: overlay` 混合模式增強效果

---

## 載入順序說明

在 `index.html` 中的載入順序經過精心設計：

```html
<!-- CSS 模組化載入 -->
<link rel="stylesheet" href="styles/variables.css">   <!-- 1. 變數優先 -->
<link rel="stylesheet" href="styles/base.css">        <!-- 2. 基礎樣式 -->
<link rel="stylesheet" href="styles/buttons.css">     <!-- 3. 按鈕系統 -->
<link rel="stylesheet" href="styles/game-ui.css">     <!-- 4. 遊戲介面 -->
<link rel="stylesheet" href="styles/modals.css">      <!-- 5. 彈窗系統 -->
<link rel="stylesheet" href="styles/milestones.css">  <!-- 6. 里程碑功能 -->
<link rel="stylesheet" href="styles/loading.css">     <!-- 7. 載入畫面 -->
<link rel="stylesheet" href="styles/animations.css">  <!-- 8. 動畫效果 -->
```

**順序原則**:
1. **變數最先** - 提供 CSS 變數給其他模組使用
2. **基礎其次** - 建立全域樣式基礎
3. **組件按功能** - 按鈕 → 介面 → 彈窗 → 功能模組
4. **動畫最後** - 最後載入可覆蓋其他模組的動畫

---

## 模組化優勢

### ✅ 可讀性提升
- 每個檔案職責單一，檔名即可知道內容
- 不用在 2300+ 行中搜尋特定樣式
- 平均每檔 ~180 行，易於閱讀和理解

### ✅ 維護性提升
- 修改按鈕？直接打開 `buttons.css`
- 調整動畫？直接打開 `animations.css`
- 改動不會影響其他模組

### ✅ 協作友善
- 多人可同時編輯不同模組
- Git 衝突大幅減少
- Code Review 更容易

### ✅ 擴充性佳
- 新增功能？新增對應模組
- 移除功能？刪除對應檔案
- 模組可獨立測試和優化

### ✅ 效能優化潛力
- 未來可按需載入模組
- 易於識別未使用的 CSS
- 方便實施 CSS Tree Shaking

---

## 自訂與擴充

### 新增模組
如需新增新的樣式模組，建議步驟：

1. 在 `styles/` 建立新檔案，如 `styles/new-feature.css`
2. 在 `index.html` 適當位置加入載入：
   ```html
   <link rel="stylesheet" href="styles/new-feature.css">
   ```
3. 考慮載入順序（是否依賴其他模組的變數或樣式）

### 調整變數
所有設計系統變數集中在 `variables.css`，修改即可全域生效：

```css
/* 修改主題色 */
--color-accent-blue: #4361ee;  /* 改為其他藍色 */

/* 調整間距 */
--spacing-md: 20px;  /* 增加預設間距 */
```

---

## 還原方式

如需還原到單一 `style.css`：

1. 修改 `index.html` 第 31-40 行
2. 將模組化載入改回：
   ```html
   <link rel="stylesheet" href="style.css">
   ```
3. 原始 `style.css` 已保留完整內容，可直接使用

---

## 技術細節

### 路徑調整
因 CSS 檔案從根目錄移至 `styles/` 子目錄，圖片路徑需調整：

```css
/* 原本在 style.css */
background-image: url('images/badassbackground.webp');

/* 在 styles/base.css 中 */
background-image: url('../images/badassbackground.webp');  /* 需要 ../ */
```

### 瀏覽器支援
- 所有模組使用標準 CSS3
- 無需額外編譯或處理
- 支援所有現代瀏覽器

### 效能影響
- 多個小檔案 vs 單一大檔案：現代瀏覽器 HTTP/2 下無明顯差異
- 瀏覽器會快取各個模組
- 修改單一模組不影響其他模組的快取

---

## 最佳實踐

### 命名規範
- 使用語義化的 class 名稱
- 遵循現有的命名慣例 (如 `.btn-primary`)
- 避免過於具體的命名

### 模組職責
- 保持單一職責原則
- 相關樣式集中在同一模組
- 避免跨模組的強耦合

### 註解說明
- 在複雜樣式前加上註解
- 說明設計意圖和使用場景
- 標註重要的 `!important` 使用原因

---

## 維護建議

1. **定期檢查** - 移除未使用的樣式規則
2. **合併重複** - 提取共用樣式到 base.css
3. **變數優先** - 新增樣式優先使用 CSS 變數
4. **測試覆蓋** - 修改後測試所有使用該模組的功能
5. **文檔更新** - 新增模組或重大修改時更新此文檔

---

## 參考資料

- [原始 style.css](../style.css) - 保留作為備份參考
- [CSS 模組目錄](../styles/) - 所有模組檔案位置
- [實作計畫](implementation_plan.md) - 詳細的重構計畫（如有）
