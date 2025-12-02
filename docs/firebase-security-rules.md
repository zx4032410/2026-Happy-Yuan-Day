# Firebase Firestore 安全規則

> **專案名稱**: 2026 Happy Yuan Day  
> **Firebase 專案 ID**: yuan-birthday-gam  
> **最後更新時間**: 2025-12-02 17:05 (GMT+8)

---

## 📋 目前使用的完整安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 🔑 管理員名單
    function isAdmin() {
      return request.auth != null && request.auth.uid in [
        'AfawV30FwqTeHvB8wbyq31kS1NE2',  // 主要測試帳號
        'your-admin-uid-2'   // 備用管理員帳號
      ];
    }

    // ⭐ 全域統計資料（里程碑總分）
    match /statistics/global {
      allow read: if true;  // 所有人都可以讀取里程碑進度
      allow write: if request.auth != null;  // 已登入使用者可以更新
    }

    // 📊 分數記錄
    match /scores/{scoreId} {
      allow read: if true;  // 公開排行榜
      allow create: if request.auth != null;  // 已登入可建立分數
      allow update, delete: if isAdmin();  // 只有管理員可修改/刪除
    }

    // 👤 玩家個人資料
    match /players/{userId} {
      allow read: if true;  // 公開讀取
      allow create, update: if request.auth != null &&
        (request.auth.uid == userId || isAdmin());  // 只能修改自己的資料
      allow delete: if isAdmin();  // 只有管理員可刪除
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

## 🛡️ 安全性說明

### 目前設計

- **匿名登入**: 使用 Firebase Anonymous Authentication
- **公開讀取**: 所有資料都可以公開讀取（適合排行榜展示）
- **寫入保護**: 只有已登入使用者可以建立/更新資料
- **自我保護**: 玩家只能修改自己的資料（透過 `request.auth.uid == userId` 驗證）

### 已知限制

⚠️ 目前的規則**允許匿名使用者直接寫入 `statistics/global`**，理論上可能被惡意利用。

### 建議改進方向（未來考慮）

1. 使用 **Cloud Functions** 處理分數上傳，避免客戶端直接寫入
2. 加入**分數驗證邏輯**，防止異常高分
3. 限制**寫入頻率**，防止洗分行為

---

## 📝 更新日誌

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
