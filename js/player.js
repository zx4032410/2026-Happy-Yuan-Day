class Player {
    constructor(gameScale, canvasWidth, canvasHeight, onLoadCallback, onErrorCallback) {
        this.gameScale = gameScale;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // 尺寸與位置
        this.width = GAME_CONFIG.PLAYER.WIDTH * gameScale;
        this.height = GAME_CONFIG.PLAYER.HEIGHT * gameScale;
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = canvasHeight - GAME_CONFIG.PLAYER.Y_OFFSET * gameScale;
        this.speed = GAME_CONFIG.PLAYER.SPEED;

        // 圖片資源
        this.image = new Image(); // 當前顯示的圖片
        this.defaultImage = new Image();
        this.winImage = new Image();
        this.loseImage = new Image();
        this.idleFrames = [];
        
        // 動畫狀態
        this.animationTimer = 0;
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.frameRate = GAME_CONFIG.PLAYER.ANIMATION_FRAME_RATE;
        this.loaded = false;

        // 載入資源
        this.loadAssets(onLoadCallback, onErrorCallback);
    }

    static getAssetCount() {
        // default + win + lose + 6 idle frames
        return 3 + 6; 
    }

    loadAssets(onLoad, onError) {
        const idleFrameSources = [
            './images/xiao-yuan-bao-idle-1.png', 
            './images/xiao-yuan-bao-idle-2.png', 
            './images/xiao-yuan-bao-idle-3.png', 
            './images/xiao-yuan-bao-idle-4.png', 
            './images/xiao-yuan-bao-idle-5.png', 
            './images/xiao-yuan-bao-idle-6.png'
        ];

        const handleLoad = () => {
            // 簡單檢查是否全部載入完成的邏輯交給外部計數，這裡只負責觸發 callback
            if (onLoad) onLoad();
        };

        const handleError = (id) => {
            console.error(`Player asset failed: ${id}`);
            if (onError) onError(id);
        };

        // 載入預設圖 (使用第一張閒置圖)
        this.defaultImage.src = idleFrameSources[0];
        this.defaultImage.onload = () => {
            this.image = this.defaultImage; // 初始圖片
            handleLoad();
        };
        this.defaultImage.onerror = () => handleError('player-default');

        // 載入勝利/失敗圖
        this.winImage.src = './images/xiao-yuan-bao-win.png';
        this.winImage.onload = handleLoad;
        this.winImage.onerror = () => handleError('player-win');

        this.loseImage.src = './images/xiao-yuan-bao-lose.png';
        this.loseImage.onload = handleLoad;
        this.loseImage.onerror = () => handleError('player-lose');

        // 載入閒置動畫幀
        idleFrameSources.forEach((src, index) => {
            const img = new Image();
            img.src = src;
            img.onload = handleLoad;
            img.onerror = () => handleError(`player-idle-${index}`);
            this.idleFrames.push(img);
        });
    }

    update(inputManager) {
        // 1. 移動
        if (inputManager.isLeft && this.x > 0) {
            this.x -= this.speed * this.gameScale;
        }
        if (inputManager.isRight && this.x < this.canvasWidth - this.width) {
            this.x += this.speed * this.gameScale;
        }

        // 2. 閒置動畫邏輯
        const isIdleImage = this.image === this.defaultImage || this.idleFrames.includes(this.image);

        // 如果沒有移動，且當前顯示的是閒置系列圖片，則播放動畫
        if (!inputManager.isLeft && !inputManager.isRight && isIdleImage) {
            this.frameCounter++;
            if (this.frameCounter >= this.frameRate) {
                this.currentFrame = (this.currentFrame + 1) % this.idleFrames.length;
                this.image = this.idleFrames[this.currentFrame];
                this.frameCounter = 0;
            }
        } 
        
        // 3. 狀態恢復 (從 Win/Lose 狀態恢復)
        if (this.animationTimer > 0) {
            this.animationTimer--;
            if (this.animationTimer <= 0) {
                this.image = this.defaultImage;
            }
        } else {
            // 如果特殊動畫結束，且開始移動了，確保切回預設圖 (或讓 idle 邏輯接手)
            // 這裡的邏輯：如果 "非移動中" (上面if處理了動畫)，
            // 那麼 "移動中" 或 "特殊動畫結束後"，需要確保不是卡在特殊圖片上
            // 如果正在移動，且不是特殊圖片(因為timer<=0)，應顯示default
            if ((inputManager.isLeft || inputManager.isRight) && !this.idleFrames.includes(this.image) && this.image !== this.defaultImage) {
                 // 只有當前是 win/lose 但 timer 歸零時才強制切回 (其實上面的 timer 區塊已經處理了歸零切換)
                 // 但為了保險起見，如果當前圖片不是 idle 序列也不是 default，且 timer 沒了，就切回 default
                 this.image = this.defaultImage;
            }
            
            // 修正：如果沒有移動，且不是特殊圖片，確保進入 idle 循環 (上面的 if 已經處理播放，這裡處理切換回 idle 序列的起始)
             if (!inputManager.isLeft && !inputManager.isRight && !this.idleFrames.includes(this.image) && this.image !== this.defaultImage) {
                 this.image = this.defaultImage;
             }
        }
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    setHappy() {
        this.image = this.winImage;
        this.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION;
    }

    setSad() {
        this.image = this.loseImage;
        this.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION;
    }

    resize(gameScale, canvasWidth, canvasHeight) {
        this.gameScale = gameScale;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.width = GAME_CONFIG.PLAYER.WIDTH * gameScale;
        this.height = GAME_CONFIG.PLAYER.HEIGHT * gameScale;
        this.y = canvasHeight - GAME_CONFIG.PLAYER.Y_OFFSET * gameScale;
        
        // 保持相對位置或置中？原邏輯是置中，這裡我們可以重新置中，或者嘗試保持比例
        // 原邏輯：如果尺寸改變了,重新定位玩家並調整大小
        // 這裡簡單重置到中間，防止跑出界
        this.x = canvasWidth / 2 - this.width / 2;
    }

    reset() {
        this.x = this.canvasWidth / 2 - this.width / 2;
        this.y = this.canvasHeight - GAME_CONFIG.PLAYER.Y_OFFSET * this.gameScale;
        this.image = this.defaultImage;
        this.animationTimer = 0;
        this.frameCounter = 0;
    }
}
