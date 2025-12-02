class InputManager {
    constructor() {
        this.keys = { left: false, right: false };
        this.isActive = false;
        this.moveLeftBtn = document.getElementById('move-left');
        this.moveRightBtn = document.getElementById('move-right');

        this.initListeners();
    }

    /**
     * 設定輸入管理器是否啟用
     * @param {boolean} active 
     */
    setActive(active) {
        this.isActive = active;
        if (!active) {
            this.resetKeys();
        }
    }

    /**
     * 重置按鍵狀態
     */
    resetKeys() {
        this.keys.left = false;
        this.keys.right = false;
    }

    initListeners() {
        // 鍵盤監聽
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            if (e.key === 'ArrowLeft') this.keys.left = true;
            if (e.key === 'ArrowRight') this.keys.right = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') this.keys.left = false;
            if (e.key === 'ArrowRight') this.keys.right = false;
        });

        // 全局滑鼠釋放監聽 (防止按鍵卡住)
        document.addEventListener('mouseup', () => {
            this.resetKeys();
        });

        // 按鈕監聽
        this.bindTouchButton(this.moveLeftBtn, 'left');
        this.bindTouchButton(this.moveRightBtn, 'right');
    }

    bindTouchButton(btn, direction) {
        if (!btn) return;

        const handleStart = (e) => {
            if (e.cancelable) e.preventDefault(); // 防止雙擊縮放等預設行為
            if (!this.isActive) return;

            this.triggerVibration(10);
            this.keys[direction] = true;
        };

        const handleEnd = (e) => {
            // if (e.cancelable) e.preventDefault();
            this.keys[direction] = false;
        };

        // Touch 事件
        btn.addEventListener('touchstart', handleStart, { passive: false });
        btn.addEventListener('touchend', handleEnd);

        // 滑鼠事件 (電腦版測試用)
        btn.addEventListener('mousedown', (e) => {
            if (!this.isActive) return;
            this.keys[direction] = true;
        });
        // mouseup 由全局監聽處理
    }

    triggerVibration(duration = 10) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    get isLeft() {
        return this.keys.left;
    }

    get isRight() {
        return this.keys.right;
    }
}
