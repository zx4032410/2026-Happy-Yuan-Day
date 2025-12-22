# Track 01: 程式碼體質強化與自動化測試

**目標**: 提升程式碼的可維護性，並建立自動化測試防護網，確保未來的改動不會破壞現有功能。

## Context & Status
- **目前狀況**: 
  - `game.js` 包含大量核心邏輯，可能與 `player.js` 或 Managers 耦合過重。
  - 目前完全沒有測試代碼，改動邏輯風險高。
  - 效能優化已完成 (Track 00 - Adhoc)。
- **預期產出**:
  - 解耦的遊戲邏輯。
  - 至少覆蓋核心計分與狀態管理的單元測試 (Unit Tests)。
  - 簡單的測試執行指令 (e.g., `npm test`)。

## Execution Plan

### Phase 1: 環境建置 (Setup)
- [x] **Step 1.1**: 初始化 `package.json` (如果尚未完善) 並安裝測試框架 (建議使用 `Jest`，因其對 React/Vanilla JS 都很友善且設定簡單)。
- [x] **Step 1.2**: 設定測試環境配置 (Jest Config)。

### Phase 2: 核心邏輯重構 (Refactoring to ES Modules)
- [x] **Step 2.1**: 建立 ES Module 基礎架構
    - [x] **Step 2.1.1**: 更新 `index.html`，將主要進入點 `game.js` 的 script 標籤改為 `type="module"`，並移除其他 Managers 的直接引用（改由 game.js 內部 import）。
    - [x] **Step 2.1.2**: 檢查 `package.json` 確保 Jest 支援 ES Modules (設定 `type: "module"` 或使用 Babel)。
- [x] **Step 2.2**: 模組化 Managers (逐個擊破)
    - [x] **Step 2.2.1**: 重構 `js/game-config.js` 為 export const。
    - [x] **Step 2.2.2**: 重構 `js/lang.js` 為 export default。
    - [x] **Step 2.2.3**: 重構 `js/questions.js` 為 export default。
    - [x] **Step 2.2.4**: 重構 `js/managers/*.js` (UI, Audio, Effect, Input, Item, Share, Database) 為 Class Export。
- [x] **Step 2.3**: 重構 `js/game.js` (主程式)
    - [x] **Step 2.3.1**: 在 `game.js` 頭部加入所有 Managers 的 `import` 語句。
    - [x] **Step 2.3.2**: 修正初始化邏輯，確保變數作用域正確。
    - [x] **Step 2.3.3**: 讓 `js/player.js` 也能以模組方式被 `game.js` 使用。

### Phase 3: 撰寫測試 (Writing Tests)
- [x] **Step 3.1**: 為 `ScoreManager` 或計分邏輯撰寫單元測試（測試加分、扣分、Fever Time 倍率）。
- [x] **Step 3.2**: 為 `GameState` 撰寫測試（測試遊戲結束判斷、重新開始邏輯）。

### Phase 4: 驗證與文件 (Verification)
- [x] **Step 4.1**: 執行全套測試並確保通過。
- [x] **Step 4.2**: 更新 `README.md`，加入「如何執行測試」的說明。
