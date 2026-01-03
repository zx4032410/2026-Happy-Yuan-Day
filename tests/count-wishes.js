/**
 * 🎂 查詢 Firestore 祝福數量
 * 
 * 使用方式：node tests/count-wishes.js
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 初始化 Firebase Admin
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function countWishes() {
  try {
    console.log('🔍 正在查詢祝福數量...\n');
    
    const wishesSnapshot = await db.collection('wishes').get();
    const wishCount = wishesSnapshot.size;
    
    console.log(`📊 目前祝福總數：${wishCount} 則\n`);
    
    if (wishCount > 0) {
      console.log('📝 祝福列表預覽（前 10 則）：');
      console.log('─'.repeat(50));
      
      let count = 0;
      wishesSnapshot.forEach(doc => {
        if (count >= 10) return;
        const data = doc.data();
        const nickname = data.nickname || '匿名';
        const message = data.message || '';
        const displayMsg = message.length > 30 ? message.substring(0, 30) + '...' : message;
        console.log(`  ${count + 1}. ${nickname}: ${displayMsg}`);
        count++;
      });
      
      if (wishCount > 10) {
        console.log(`  ... 還有 ${wishCount - 10} 則祝福`);
      }
    }
    
    console.log('\n' + '─'.repeat(50));
    console.log('💡 跑馬燈建議：');
    
    if (wishCount === 0) {
      console.log('   ⚠️ 目前沒有祝福，跑馬燈不會顯示');
    } else if (wishCount <= 5) {
      console.log('   📌 祝福較少，建議：');
      console.log('      - 增加重複次數（目前 2 次可能不夠）');
      console.log('      - 減慢跑馬燈速度（讓祝福停留久一點）');
    } else if (wishCount <= 15) {
      console.log('   ✅ 祝福數量適中，建議：');
      console.log('      - 目前設定應該 OK');
      console.log('      - 可稍微調慢速度增加可讀性');
    } else if (wishCount <= 30) {
      console.log('   ✅ 祝福數量很棒！建議：');
      console.log('      - 目前設定應該完美');
    } else {
      console.log('   📌 祝福很多！建議：');
      console.log('      - 可略微加快跑馬燈速度');
      console.log('      - 或增加排數');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
    process.exit(1);
  }
}

countWishes();
