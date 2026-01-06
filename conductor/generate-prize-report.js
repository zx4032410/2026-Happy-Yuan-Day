/**
 * 🎁 抽獎資格報告產生器
 * 
 * 產生符合第二階段（25,000分）與第三階段（50,000分）抽獎資格的玩家清單
 * 
 * 使用方式：node conductor/generate-prize-report.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// 里程碑門檻
const TIER_2_SCORE = 25000;
const TIER_3_SCORE = 50000;

// 尋找服務帳號金鑰
function findServiceAccountKey() {
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT,
    resolve(projectRoot, 'serviceAccountKey.json'),
  ].filter(Boolean);

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf8'));
    }
  }

  console.error('❌ 找不到 Firebase 服務帳號金鑰！');
  process.exit(1);
}

// 初始化 Firebase Admin
const serviceAccount = findServiceAccountKey();
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function generatePrizeReport() {
  console.log('🎁 開始產生抽獎資格報告...\n');

  try {
    // 1. 載入所有玩家資料
    console.log('📊 載入玩家資料...');
    const playersSnapshot = await db.collection('players').get();
    
    // 2. 載入所有分數以計算遊戲次數
    console.log('📊 載入遊戲紀錄...');
    const scoresSnapshot = await db.collection('scores').get();
    
    // 計算每個玩家的遊戲次數
    const gameCounts = {};
    scoresSnapshot.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      gameCounts[userId] = (gameCounts[userId] || 0) + 1;
    });

    // 3. 分類玩家
    const tier2Players = [];
    const tier3Players = [];

    playersSnapshot.forEach(doc => {
      const data = doc.data();
      const score = data.cumulativeScore || 0;
      const igHandle = data.instagramHandle || null;
      const gameCount = gameCounts[doc.id] || 0;

      const playerInfo = {
        odl: doc.id,
        igHandle: igHandle,
        score: score,
        gameCount: gameCount
      };

      if (score >= TIER_3_SCORE) {
        tier3Players.push(playerInfo);
      } else if (score >= TIER_2_SCORE) {
        tier2Players.push(playerInfo);
      }
    });

    // 排序（分數由高到低）
    tier2Players.sort((a, b) => b.score - a.score);
    tier3Players.sort((a, b) => b.score - a.score);

    // 4. 產生 Markdown 報告
    const now = new Date();
    const timestamp = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

    let markdown = `# 🎁 抽獎資格報告

> 產生時間：${timestamp}

---

## 📊 統計摘要

| 階段 | 門檻分數 | 符合人數 |
|------|---------|---------|
| 第二階段（實體抽獎） | ${TIER_2_SCORE.toLocaleString()} 分 | **${tier2Players.length}** 人 |
| 第三階段（月曆卡抽獎） | ${TIER_3_SCORE.toLocaleString()} 分 | **${tier3Players.length}** 人 |
| **總計** | | **${tier2Players.length + tier3Players.length}** 人 |

---

## 🏆 第三階段：月曆卡抽獎資格（${TIER_3_SCORE.toLocaleString()}+ 分）

共 **${tier3Players.length}** 位玩家符合資格：

| # | IG 帳號 | 累積分數 | 遊戲次數 |
|---|--------|---------|---------|
`;

    tier3Players.forEach((player, index) => {
      const igDisplay = player.igHandle ? `@${player.igHandle}` : '（未提供）';
      markdown += `| ${index + 1} | ${igDisplay} | ${player.score.toLocaleString()} | ${player.gameCount} |\n`;
    });

    markdown += `
---

## ⭐ 第二階段：實體抽獎資格（${TIER_2_SCORE.toLocaleString()}+ 分）

共 **${tier2Players.length}** 位玩家符合資格（不含已達第三階段者）：

| # | IG 帳號 | 累積分數 | 遊戲次數 |
|---|--------|---------|---------|
`;

    tier2Players.forEach((player, index) => {
      const igDisplay = player.igHandle ? `@${player.igHandle}` : '（未提供）';
      markdown += `| ${index + 1} | ${igDisplay} | ${player.score.toLocaleString()} | ${player.gameCount} |\n`;
    });

    markdown += `
---

## 📝 備註

- 第三階段玩家同時符合第二階段資格
- 「未提供」表示玩家未填寫 IG 帳號
- 遊戲次數為該玩家總共遊玩的次數
`;

    // 5. 寫入檔案
    const outputPath = resolve(projectRoot, 'docs', 'prize-draw-report.md');
    writeFileSync(outputPath, markdown, 'utf8');

    console.log('\n✅ 報告產生完成！');
    console.log(`📄 檔案位置：${outputPath}`);
    console.log(`\n📈 統計：`);
    console.log(`   - 第二階段（${TIER_2_SCORE.toLocaleString()}+ 分）：${tier2Players.length} 人`);
    console.log(`   - 第三階段（${TIER_3_SCORE.toLocaleString()}+ 分）：${tier3Players.length} 人`);
    console.log(`   - 總計：${tier2Players.length + tier3Players.length} 人`);

  } catch (error) {
    console.error('❌ 產生報告失敗：', error);
    process.exit(1);
  }
}

generatePrizeReport();
