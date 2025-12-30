/**
 * 排行榜快取更新腳本
 * 
 * 此腳本會從 Firestore 讀取 players 和 scores 資料，
 * 計算各類排行榜，然後將結果寫入 leaderboardCache/data 文件。
 * 
 * 使用方式：
 * 1. 確保安裝依賴：npm install firebase-admin
 * 2. 設定環境變數 FIREBASE_SERVICE_ACCOUNT 指向你的服務帳號 JSON 檔案路徑
 *    或將服務帳號 JSON 放在專案根目錄並命名為 serviceAccountKey.json
 * 3. 執行：node conductor/update-leaderboard-cache.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// 尋找服務帳號金鑰
function findServiceAccountKey() {
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT,
    resolve(projectRoot, 'serviceAccountKey.json'),
    resolve(projectRoot, 'firebase-service-account.json'),
  ].filter(Boolean);

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`📝 使用服務帳號金鑰: ${path}`);
      return JSON.parse(readFileSync(path, 'utf8'));
    }
  }

  console.error('❌ 找不到 Firebase 服務帳號金鑰！');
  console.error('請執行以下步驟：');
  console.error('1. 前往 Firebase Console > 專案設定 > 服務帳戶');
  console.error('2. 點擊「產生新的私密金鑰」');
  console.error('3. 將下載的 JSON 檔案放到專案根目錄，命名為 serviceAccountKey.json');
  process.exit(1);
}

// 初始化 Firebase Admin
const serviceAccount = findServiceAccountKey();
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 遮蔽 ID（保護隱私）
function maskId(id) {
  if (!id || id.length < 8) return id || '匿名';
  return id.substring(0, 4) + '***' + id.substring(id.length - 4);
}

async function updateLeaderboardCache() {
  console.log('🚀 開始更新排行榜快取...\n');

  try {
    // 1. 載入所有玩家資料
    console.log('📊 載入玩家資料...');
    const playersSnapshot = await db.collection('players').get();
    const playerMap = {};
    playersSnapshot.forEach(doc => {
      const data = doc.data();
      playerMap[doc.id] = {
        instagramHandle: data.instagramHandle,
        cumulativeScore: data.cumulativeScore || 0
      };
    });
    console.log(`   找到 ${playersSnapshot.size} 位玩家`);

    // 2. 載入所有分數資料
    console.log('📊 載入遊戲紀錄...');
    const scoresSnapshot = await db.collection('scores').get();
    console.log(`   找到 ${scoresSnapshot.size} 筆遊戲紀錄`);

    // 3. 計算各類排行榜
    console.log('🏆 計算排行榜...');

    // 3a. 玩最多次的玩家
    const gameCounts = {};
    const correctCounts = {};
    scoresSnapshot.forEach(doc => {
      const data = doc.data();
      const id = data.userId;
      
      // 遊戲次數
      gameCounts[id] = (gameCounts[id] || 0) + 1;
      
      // 答對題數
      const correct = data.stats?.questionsCorrect || 0;
      correctCounts[id] = (correctCounts[id] || 0) + correct;
    });

    const mostGames = Object.entries(gameCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        displayName: playerMap[id]?.instagramHandle || '匿名玩家',
        maskedId: maskId(id),
        value: count
      }));

    // 3b. 累積分數最高的玩家
    const highestScore = Object.entries(playerMap)
      .sort((a, b) => (b[1].cumulativeScore || 0) - (a[1].cumulativeScore || 0))
      .slice(0, 5)
      .map(([id, data]) => ({
        displayName: data.instagramHandle || '匿名玩家',
        maskedId: maskId(id),
        value: data.cumulativeScore || 0
      }));

    // 3c. 答對最多題的玩家
    const mostCorrect = Object.entries(correctCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        displayName: playerMap[id]?.instagramHandle || '匿名玩家',
        maskedId: maskId(id),
        value: count
      }));

    // 3d. 單局最高分
    const allScores = [];
    scoresSnapshot.forEach(doc => {
      const data = doc.data();
      allScores.push({
        userId: data.userId,
        score: data.score || 0
      });
    });
    const bestSingle = allScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        displayName: playerMap[item.userId]?.instagramHandle || '匿名玩家',
        maskedId: maskId(item.userId),
        value: item.score
      }));

    // 4. 取得全球總分
    let totalScore = 0;
    const globalStats = await db.collection('statistics').doc('global').get();
    if (globalStats.exists) {
      totalScore = globalStats.data().totalScore || 0;
    }

    // 5. 組裝快取資料
    const cacheData = {
      updatedAt: FieldValue.serverTimestamp(),
      stats: {
        totalPlayers: playersSnapshot.size,
        totalGames: scoresSnapshot.size,
        totalScore: totalScore
      },
      mostGames,
      highestScore,
      mostCorrect,
      bestSingle
    };

    // 6. 寫入 Firestore
    console.log('💾 寫入快取...');
    await db.collection('leaderboardCache').doc('data').set(cacheData);

    console.log('\n✅ 排行榜快取更新完成！');
    console.log('📈 統計摘要：');
    console.log(`   - 總玩家數：${playersSnapshot.size}`);
    console.log(`   - 總遊戲次數：${scoresSnapshot.size}`);
    console.log(`   - 全球總分：${totalScore.toLocaleString()}`);
    console.log('\n🎉 下次打開排行榜頁面只需要 1 次讀取！');

  } catch (error) {
    console.error('❌ 更新失敗：', error);
    process.exit(1);
  }
}

updateLeaderboardCache();
