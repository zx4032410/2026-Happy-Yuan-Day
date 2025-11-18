// offline-handler.js

// 等待 DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    const offlineOverlay = document.getElementById('offline-overlay');
    const retryButton = document.getElementById('retry-button');

    // 顯示離線提示畫面的函式
    const showOfflineUI = () => {
        // 如果資源載入畫面還在，先隱藏它，避免重疊
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        if (offlineOverlay) {
            offlineOverlay.classList.remove('hidden');
        }
    };

    // 重試按鈕的邏輯：重新載入頁面
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            // 顯示一個短暫的「正在重試...」提示，然後重載
            retryButton.textContent = '正在重試...';
            retryButton.disabled = true;
            window.location.reload();
        });
    }

    // 監聽瀏覽器的離線事件
    window.addEventListener('offline', () => {
        console.log('網路已離線');
        showOfflineUI();
    });

    // 監聽瀏覽器的上線事件
    window.addEventListener('online', () => {
        console.log('網路已恢復連線');
        // 當網路恢復時，可以自動觸發重試
        // 這裡我們直接重載頁面，讓使用者回到正常的遊戲流程
        window.location.reload();
    });

    // **核心：在頁面初次載入時，立即檢查網路狀態**
    // 這是為了處理一開始就沒有網路的情況
    if (!navigator.onLine) {
        console.log('頁面載入時檢測到離線');
        showOfflineUI();
    }
});
