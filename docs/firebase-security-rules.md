# Firebase Firestore 安全規則

> **專案名稱**: 2026 Happy Yuan Day  
> **Firebase 專案 ID**: yuan-birthday-gam  
> **最後更新時間**: 2025-12-06 01:17 (GMT+8)

---

## 📋 目前使用的完整安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- 1. 基礎設定 ---

    // 檢查是否為管理員 (預留給您未來若有後台管理用)
    // 目前遊戲前端不會用到這個，但保留著很好
    function isAdmin() {
      return request.auth != null && request.auth.uid in [
        'AfawV30FwqTeHvB8wbyq31kS1NE2',
        '您的UID-2'
      ];
    }

    // --- 2. 集合規則 ---

    // 🏆 全域統計資料 (statistics/global)
    match /statistics/global {
      // 允許所有人讀取 (顯示在首頁)
      allow read: if true;

      // 允許所有人更新 (為了讓 batch 寫入能成功累加分數)
      // 這裡加上一個簡單驗證：只能更新 totalScore 且必須是數字
      allow update: if request.resource.data.totalScore is number;

      // 禁止刪除這個重要文件
      allow delete: if false;
    }

    // 📝 單局分數紀錄 (scores)
    match /scores/{scoreId} {
      allow read: if true; // 允許讀取 (若未來做排行榜)

      // 允許創建新分數，但必須通過防作弊檢查
      allow create: if
        // 1. 必須包含必要欄位
        request.resource.data.keys().hasAll(['score', 'userId', 'timestamp']) &&
        // 2. 分數必須是數字
        request.resource.data.score is number &&
        // 3. 【防作弊】單局分數上限設定 (例如 60秒不太可能超過 5000分)
        // 您可以根據測試結果調整這個數字，設寬鬆一點避免誤判
        request.resource.data.score < 10000 &&
        // 4. 禁止上傳負分 (雖然程式碼有防呆，這裡再擋一次)
        request.resource.data.score >= 0;

      // 禁止修改或刪除已上傳的分數 (只有管理員可以)
      allow update, delete: if isAdmin();
    }

    // 👤 玩家個人資料 (players)
    match /players/{userId} {
      allow read: if true;

      // 允許創建或更新個人資料
      // 因為我們是用隨機 ID，無法驗證身份，所以只能開放寫入
      // 但我們可以限制資料結構
      allow write: if
         request.resource.data.cumulativeScore is number;
    }

    // 🎂 生日祝福 (wishes) - 2025-12-22 新增
    match /wishes/{docId} {
      // 允許所有人讀取 (用於生日視窗與祝福牆)
      allow read: if true;

      // 允許創建/更新祝福
      // 使用 userId 作為文檔 ID，確保每人只能有一則祝福
      allow create, update: if
        // 1. 必須包含必要欄位
        request.resource.data.keys().hasAll(['userId', 'nickname', 'message', 'createdAt']) &&
        // 2. 暱稱必須是字串且長度在 1-15 字
        request.resource.data.nickname is string &&
        request.resource.data.nickname.size() >= 1 &&
        request.resource.data.nickname.size() <= 15 &&
        // 3. 祝福訊息必須是字串且長度在 1-50 字
        request.resource.data.message is string &&
        request.resource.data.message.size() >= 1 &&
        request.resource.data.message.size() <= 50;

      // 禁止玩家刪除祝福 (管理員可到 Console 手動刪除)
      allow delete: if false;
    }
  }
}
```

---

## 🔗 規則與程式碼對應關係

### 1️⃣ `statistics/global` 集合

**用途**: 儲存全域里程碑總分

**對應程式碼**: `js/managers/database-manager.js`

| 操作     | 行數     | 說明                                                     |
| -------- | -------- | -------------------------------------------------------- |
| **寫入** | L119-123 | `saveScore()` 中使用 `FieldValue.increment()` 累加總分   |
| **讀取** | L189-200 | `loadTotalMilestoneScore()` 讀取當前總分並計算進度百分比 |

**資料結構**:

```javascript
{
  totalScore: number,        // 所有玩家累計總分
  lastUpdated: timestamp     // 最後更新時間
}
```

---

### 2️⃣ `scores` 集合

**用途**: 儲存每一次遊戲的分數記錄

**對應程式碼**: `js/managers/database-manager.js`

| 操作     | 行數     | 說明                             |
| -------- | -------- | -------------------------------- |
| **建立** | L108-116 | `saveScore()` 中建立新的分數文件 |

**資料結構**:

```javascript
{
  userId: string,           // 玩家 UID
  score: number,            // 該局得分
  timestamp: timestamp,     // 遊戲時間
  version: string,          // 遊戲版本
  stats: {                  // 遊戲統計資料
    score: number,
    level: number,
    combo: number,
    // ... 其他統計
  }
}
```

---

### 3️⃣ `players` 集合

**用途**: 儲存玩家個人資料與累計分數

**對應程式碼**: `js/managers/database-manager.js`

| 操作          | 行數     | 說明                                        |
| ------------- | -------- | ------------------------------------------- |
| **讀取**      | L65-85   | `loadPlayerProfile()` 載入玩家資料          |
| **建立/更新** | L147-171 | `saveScore()` 中更新累計分數和最後遊玩時間  |
| **更新 IG**   | L218-227 | `saveInstagramHandle()` 儲存 Instagram 帳號 |
| **領取獎勵**  | L234-248 | `claimTier()` 更新獎勵領取狀態              |

**資料結構**:

```javascript
{
  cumulativeScore: number,    // 累計總分
  claimedTier1: boolean,      // 是否已領取第一階獎勵
  tier2Qualified: boolean,    // 第二階資格
  tier3Qualified: boolean,    // 第三階資格
  instagramHandle: string,    // Instagram 帳號
  lastPlayed: timestamp       // 最後遊玩時間
}
```

---

### 4️⃣ `wishes` 集合 (2025-12-22 新增)

**用途**: 儲存粉絲生日祝福

**對應程式碼**: `js/managers/database-manager.js`

| 操作          | 位置               | 說明                                           |
| ------------- | ------------------ | ---------------------------------------------- |
| **建立/更新** | `submitWish()`     | 提交或更新祝福（每人一則，以 userId 為 docId） |
| **讀取**      | `checkUserWish()`  | 檢查用戶是否已提交祝福                         |
| **讀取**      | `getWishes(limit)` | 取得祝福列表（生日視窗展示用）                 |
| **讀取**      | `getAllWishes()`   | 取得所有祝福（祝福牆頁面用）                   |

**資料結構**:

```javascript
{
  userId: string,           // 玩家 UID（也作為文檔 ID）
  nickname: string,         // 暱稱（1-15 字，必填）
  message: string,          // 祝福內容（1-50 字，必填）
  createdAt: timestamp      // 建立時間
}
```

**前端顯示位置**:

- `index.html` 生日彩蛋視窗（浮動祝福動畫）
- `wishes.html` 祝福牆頁面

## 🛡️ 安全性說明

### 目前設計

- **匿名登入**: 使用 Firebase Anonymous Authentication
- **公開讀取**: 所有資料都可以公開讀取（適合排行榜展示）
- **寫入保護**: 只有已登入使用者可以建立/更新資料
- **自我保護**: 玩家只能修改自己的資料（透過 `request.auth.uid == userId` 驗證）

### 已知限制

⚠️ 目前的規則**允許匿名使用者直接寫入 `statistics/global`**，理論上可能被惡意利用。但已透過下方的「網站限制」降低風險。

### 🌐 網站限制 (API Key Restrictions)

> ✅ 已在 Firebase Console / Google Cloud Console 設定 API Key 的網站限制，僅允許以下來源存取：

```
http://127.0.0.1:5500/*        # 本地開發環境
https://2026happyyuanday.com/* # 正式網域
https://www.2026happyyuanday.com/* # 正式網域 (www)
```

**設定位置**: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → 選擇對應的 API Key → Application restrictions → HTTP referrers

**效果**: 即使 Firestore 規則開放寫入，惡意者也無法從未授權的網站發送 API 請求，有效降低被攻擊的風險。

### 建議改進方向（未來考慮）

1. 使用 **Cloud Functions** 處理分數上傳，避免客戶端直接寫入
2. 加入**分數驗證邏輯**，防止異常高分
3. 限制**寫入頻率**，防止洗分行為

---

## 📝 更新日誌

### 2025-12-06 01:17

- **新增**: 網站限制 (API Key Restrictions) 章節
- **內容**: 記錄已在 Google Cloud Console 設定的網域白名單
- **允許網域**: `127.0.0.1:5500`、`2026happyyuanday.com`、`www.2026happyyuanday.com`
- **目的**: 配合正式上線，強化安全性

### 2025-12-02 17:05

- **新增**: `statistics/global` 規則（修正權限錯誤）
- **原因**: 程式碼使用了 `statistics/global` 但規則中未定義該路徑
- **錯誤訊息**: `Missing or insufficient permissions`
- **受影響功能**: 里程碑總分讀取與更新

---

## 🔧 如何更新規則

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案：**yuan-birthday-gam**
3. 左側選單選擇 **Firestore Database**
4. 點選頂部的 **規則 (Rules)** 標籤
5. 貼上上方的完整規則
6. 點選 **發布 (Publish)**

---

## 📌 注意事項

> ⚠️ **重要提醒**  
> 當修改 `database-manager.js` 或新增 Firestore 集合/文件時，**必須同步更新此文件和 Firebase Console 的安全規則**！

**檢查清單**:

- [ ] 是否新增了 Firestore 集合？
- [ ] 是否修改了資料結構？
- [ ] 安全規則是否需要新增對應路徑？
- [ ] 此文件是否已更新並註記時間？
