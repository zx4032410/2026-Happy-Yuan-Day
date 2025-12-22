/**
 * 🎂 生日祝福測試資料說明
 * 
 * ⚠️ 注意：Firebase 安全規則設定禁止客戶端刪除祝福！
 * 
 * 【新增假資料】
 * 在瀏覽器 Console 執行以下程式碼：
 */

// === 新增 5 筆假資料 ===
async function addFakeWishes() {
  const fakeWishes = [
    { nickname: '小熊粉絲', message: '媛媛生日快樂！永遠支持你～💕' },
    { nickname: 'Yuan最棒', message: '祝媛媛新的一年更加閃耀！🌟' },
    { nickname: '幻藍熊熊', message: '生日快樂！希望每天都開心～' },
    { nickname: 'GENBLUE愛', message: '媛媛 Happy Birthday! 我們永遠在！' },
    { nickname: '應援團長', message: '26歲生日快樂！繼續加油喔 🎂✨' },
  ];

  const db = firebase.firestore();
  
  for (let i = 0; i < fakeWishes.length; i++) {
    const wish = fakeWishes[i];
    const docId = `fake_wish_${i + 1}`;
    
    await db.collection('wishes').doc(docId).set({
      userId: docId,
      nickname: wish.nickname,
      message: wish.message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`✅ 已新增假資料 ${i + 1}: ${wish.nickname}`);
  }
  
  console.log('🎉 所有假資料已新增完成！');
}

// 執行：
// addFakeWishes();

/**
 * 【刪除假資料】
 * 
 * ❌ 無法從客戶端刪除（安全規則禁止）
 * ✅ 請到 Firebase Console 手動刪除：
 *    1. https://console.firebase.google.com/
 *    2. 選擇專案 yuan-birthday-gam
 *    3. Firestore Database → wishes 集合
 *    4. 刪除 fake_wish_1 ~ fake_wish_5
 */
