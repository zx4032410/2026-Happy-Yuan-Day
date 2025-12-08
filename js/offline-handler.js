// offline-handler.js

const OFFLINE_SCORES_KEY = 'yuan-game-offline-scores';

/**
 * Saves a single game score record to localStorage.
 * This function will be exposed globally via window.offlineManager.
 * @param {object} scoreData - The score data object to save.
 */
function saveScoreOffline(scoreData) {
    console.log('網路離線，將分數儲存至本機...');
    try {
        const offlineScores = JSON.parse(localStorage.getItem(OFFLINE_SCORES_KEY)) || [];
        offlineScores.push(scoreData);
        localStorage.setItem(OFFLINE_SCORES_KEY, JSON.stringify(offlineScores));
        console.log(`成功儲存 ${offlineScores.length} 筆分數於本機。`);
        
        const lang = window.currentLang || 'zh-TW';
        const message = (window.i18nStrings && window.i18nStrings[lang] && window.i18nStrings[lang].offlineScoreSaved)
            ? window.i18nStrings[lang].offlineScoreSaved
            : '目前為離線狀態，您的分數已暫存，將在恢復連線後自動上傳。';
        alert(message);

    } catch (error) {
        console.error('無法將分數儲存至本機:', error);
        const lang = window.currentLang || 'zh-TW';
        const message = (window.i18nStrings && window.i18nStrings[lang] && window.i18nStrings[lang].offlineScoreError)
            ? window.i18nStrings[lang].offlineScoreError
            : '抱歉，無法暫存您的離線分數，請檢查瀏覽器儲存空間設定。';
        alert(message);
    }
}

/**
 * Syncs all offline scores to Firebase.
 */
async function syncOfflineScores() {
    if (!navigator.onLine) {
        console.log('仍在離線，延後同步。');
        return;
    }

    let offlineScoresJSON;
    try {
        offlineScoresJSON = localStorage.getItem(OFFLINE_SCORES_KEY);
    } catch (e) {
        console.log('無法讀取本機儲存，跳過離線同步。');
        return;
    }
    
    if (!offlineScoresJSON) {
        console.log('沒有待同步的離線分數。');
        return;
    }

    const offlineScores = JSON.parse(offlineScoresJSON);
    if (offlineScores.length === 0) {
        return;
    }

    console.log(`偵測到 ${offlineScores.length} 筆離線分數，開始同步...`);

    const db = firebase.firestore();
    if (!db) {
        console.error('Firebase DB 未初始化，無法同步。');
        return;
    }

    let successfulUploads = 0;
    const failedUploads = [];
    const lang = window.currentLang || 'zh-TW';

    for (const scoreData of offlineScores) {
        try {
            const scoreDataToUpload = {
                ...scoreData,
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(scoreData.timestamp)),
                syncedFromOffline: true
            };

            const batch = db.batch();
            const scoreRef = db.collection('scores').doc();
            batch.set(scoreRef, scoreDataToUpload);

            const playerRef = db.collection('players').doc(scoreData.userId);
            const playerData = {
                cumulativeScore: firebase.firestore.FieldValue.increment(scoreData.score),
                lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
            };
            batch.set(playerRef, playerData, { merge: true });

            await batch.commit();
            console.log(`成功同步一筆分數: ${scoreData.score}`);
            successfulUploads++;
        } catch (error) {
            console.error('同步單筆分數失敗:', error, '資料:', scoreData);
            failedUploads.push(scoreData);
        }
    }

    if (failedUploads.length > 0) {
        localStorage.setItem(OFFLINE_SCORES_KEY, JSON.stringify(failedUploads));
        const message = (window.i18nStrings && window.i18nStrings[lang] && window.i18nStrings[lang].syncError)
            ? window.i18nStrings[lang].syncError.replace('{count}', failedUploads.length)
            : `同步離線分數時發生錯誤，尚有 ${failedUploads.length} 筆紀錄未完成。請保持網路連線，系統將會重試。`;
        alert(message);
    } else {
        localStorage.removeItem(OFFLINE_SCORES_KEY);
        console.log('所有離線分數同步完成，已清除本機暫存。');
        const message = (window.i18nStrings && window.i18nStrings[lang] && window.i18nStrings[lang].syncSuccess)
            ? window.i18nStrings[lang].syncSuccess
            : '所有離線遊戲紀錄皆已同步成功！';
        alert(message);
    }
}

// --- UI and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const offlineOverlay = document.getElementById('offline-overlay');
    const retryButton = document.getElementById('retry-button');

    const showOfflineUI = () => {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
            loadingOverlay.classList.add('hidden');
        }
        if (offlineOverlay) {
            offlineOverlay.classList.remove('hidden');
        }
    };

    const hideOfflineUI = () => {
        if (offlineOverlay) {
            offlineOverlay.classList.add('hidden');
        }
    };

    if (retryButton) {
        retryButton.addEventListener('click', () => {
            const lang = window.currentLang || 'zh-TW';
            if (navigator.onLine) {
                hideOfflineUI();
                syncOfflineScores();
            } else {
                const message = (window.i18nStrings && window.i18nStrings[lang] && window.i18nStrings[lang].stillOffline)
                    ? window.i18nStrings[lang].stillOffline
                    : '網路尚未恢復連線，請稍後再試。';
                alert(message);
            }
        });
    }

    window.addEventListener('offline', () => {
        console.log('網路已離線');
        showOfflineUI();
    });

    window.addEventListener('online', () => {
        console.log('網路已恢復連線');
        hideOfflineUI();
        syncOfflineScores();
    });

    if (!navigator.onLine) {
        showOfflineUI();
    } else {
        syncOfflineScores();
    }

    window.offlineManager = {
        saveScoreOffline
    };
});