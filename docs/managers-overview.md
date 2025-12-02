# 遊戲管理器 (Managers) 架構說明

為了降低 `game.js` 的複雜度並提高程式碼的可維護性，本專案採用模組化架構，將不同功能的邏輯拆分至專屬的管理器 (Manager) 中。所有的管理器檔案皆位於 `js/managers/` 目錄下。

## 1. InputManager (`input-manager.js`)
**職責：** 負責處理所有玩家的輸入指令（鍵盤與觸控）。
*   **功能：**
    *   監聽鍵盤方向鍵 (`ArrowLeft`, `ArrowRight`)。
    *   監聽行動裝置的觸控按鈕 (`touchstart`, `touchend`)。
    *   提供統一的狀態存取介面 (`isLeft`, `isRight`) 供 `game.js` 查詢。
    *   管理輸入功能的啟用/停用狀態 (`setActive`)，例如在暫停或顯示彈窗時禁用輸入。
    *   觸發操作時的震動反饋 (`navigator.vibrate`)。

## 2. UIManager (`ui-manager.js`)
**職責：** 負責遊戲介面 (DOM) 的顯示、隱藏與更新。
*   **功能：**
    *   管理各個遊戲畫面（開始畫面、遊戲中資訊列、結算畫面）的切換。
    *   更新分數、時間、Fever 能量條等即時資訊。
    *   控制各種彈窗（設定、說明、里程碑、題目）的顯示。
    *   處理載入畫面的進度顯示。

## 3. AudioManager (`audio-manager.js`)
**職責：** 負責管理遊戲中的所有音效與背景音樂。
*   **功能：**
    *   載入並播放背景音樂 (BGM)，支援一般狀態與 Fever 狀態的切換。
    *   使用音效池 (AudioPool) 技術播放音效 (SFX)，避免密集觸發時的聲音延遲或被吃掉。
    *   管理全域靜音狀態。

## 4. DatabaseManager (`database-manager.js`)
**職責：** 負責與後端資料庫 (Firebase) 進行互動。
*   **功能：**
    *   處理使用者匿名登入 (Firebase Auth)。
    *   讀取與儲存玩家個人資料（最高分、累積積分、IG 帳號等）。
    *   上傳遊戲結算分數。
    *   讀取全體玩家的累積應援進度。

## 5. ShareManager (`share-manager.js`)
**職責：** 負責生成分享圖卡與呼叫社群分享功能。
*   **功能：**
    *   使用 Canvas 動態繪製成績分享圖卡（支援方形與限時動態長條兩種格式）。
    *   處理圖片下載功能。
    *   呼叫 Web Share API 進行原生分享。

## 6. EffectManager (`effect-manager.js`)
**職責：** 負責遊戲中的視覺特效。
*   **功能：**
    *   管理得分時飄出的數字特效。
    *   控制 Fever Time 的全螢幕視覺效果（速度線、暗角）。
    *   根據遊戲縮放比例 (Game Scale) 自動調整特效尺寸與位置。

---
*最後更新日期：2025-12-03*
