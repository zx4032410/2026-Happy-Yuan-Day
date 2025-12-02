class ItemManager {
    constructor(gameScale, canvasWidth, canvasHeight, config, onScoreCallback) {
        this.gameScale = gameScale;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.config = config;
        this.onScoreCallback = onScoreCallback; // Callback for score/fever updates

        this.pool = new ItemPool(50);
        this.activeItems = [];
        this.itemImages = {};
        
        // Spawn logic
        this.baseSpawnInterval = config.BASE_SPAWN_INTERVAL;
        this.spawnInterval = this.baseSpawnInterval;
        this.spawnTimer = this.spawnInterval;
        
        // Pre-calculate total probability
        this.totalSpawnProbability = config.ITEM_TYPES.reduce((sum, item) => sum + item.probability, 0);

        // Load images logic is handled externally or here?
        // To match Player pattern, let's handle loading here but triggered via a method or constructor if we pass callbacks
        // For now, we'll assume images are loaded or provide a load method.
    }

    loadAssets(onLoad, onError) {
        this.config.ITEM_TYPES.forEach(type => {
            const img = new Image();
            img.src = type.src;
            img.onload = onLoad;
            img.onerror = () => onError(type.id);
            this.itemImages[type.id] = img;
        });
    }
    
    resize(gameScale, canvasWidth, canvasHeight) {
        this.gameScale = gameScale;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Update active items position/size if needed? 
        // Usually items just flow off screen, but updating size might be visual glitch if mid-air.
        // Let's update their scale properties for consistency.
        const scaledItemSize = this.config.ITEM_DEFAULT_SIZE * gameScale;
        this.activeItems.forEach(item => {
            // Ideally we should re-calculate position relative to new width, but simply scaling size is safer for now
            item.width = scaledItemSize;
            item.height = scaledItemSize;
            // Speed also needs update?
            // If we store original speed type, we can re-calc. For now, let's leave speed as is or simple scale adjust
            // item.speed = item.originalSpeed * gameScale; // If we had originalSpeed
        });
    }

    setFeverMode(isFever) {
        if (isFever) {
            this.spawnInterval = Math.floor(this.baseSpawnInterval * this.config.FEVER.SPAWN_INTERVAL_MULTIPLIER);
        } else {
            this.spawnInterval = this.baseSpawnInterval;
        }
    }

    spawnItem() {
        let random = Math.random() * this.totalSpawnProbability;
        let chosenItemType;
        for (const itemType of this.config.ITEM_TYPES) {
            if (random < itemType.probability) {
                chosenItemType = itemType;
                break;
            }
            random -= itemType.probability;
        }
        
        if (!chosenItemType || !this.itemImages[chosenItemType.id] || !this.itemImages[chosenItemType.id].complete) {
            return;
        }

        const scaledItemSize = this.config.ITEM_DEFAULT_SIZE * this.gameScale;

        const item = this.pool.getItem();
        item.x = Math.random() * (this.canvasWidth - scaledItemSize);
        item.y = this.config.ITEM_SPAWN_Y_OFFSET * this.gameScale;
        item.width = scaledItemSize;
        item.height = scaledItemSize;
        item.speed = chosenItemType.speed * this.gameScale;
        item.score = chosenItemType.score;
        item.type = chosenItemType.type;
        item.image = this.itemImages[chosenItemType.id];
        
        this.activeItems.push(item);
    }

    update(player, isFeverTime) {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.spawnItem();
            this.spawnTimer = this.spawnInterval;
        }

        for (let i = this.activeItems.length - 1; i >= 0; i--) {
            let item = this.activeItems[i];
            item.y += item.speed;

            // 碰撞檢測
            if (this.checkCollision(player, item)) {
                this.handleCollision(item, isFeverTime);
                this.pool.releaseItem(item);
                this.activeItems.splice(i, 1);
            } else if (item.y > this.canvasHeight) {
                // 超出邊界
                this.pool.releaseItem(item);
                this.activeItems.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const item of this.activeItems) {
            ctx.drawImage(item.image, item.x, item.y, item.width, item.height);
        }
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    handleCollision(item, isFeverTime) {
        if (this.onScoreCallback) {
            this.onScoreCallback(item, isFeverTime);
        }
    }

    reset() {
        this.activeItems.forEach(item => this.pool.releaseItem(item));
        this.activeItems = [];
        this.spawnInterval = this.baseSpawnInterval;
        this.spawnTimer = this.spawnInterval;
        this.pool.reset();
    }
}

class ItemPool {
    constructor(size = 30) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createItem());
        }
    }

    createItem() {
        return {
            active: false,
            x: 0, y: 0, width: 0, height: 0,
            speed: 0, score: 0, type: '', image: null
        };
    }

    getItem() {
        const item = this.pool.find(i => !i.active);
        if (item) {
            item.active = true;
            return item;
        }
        // Expand pool
        const newItem = this.createItem();
        newItem.active = true;
        this.pool.push(newItem);
        return newItem;
    }

    releaseItem(item) {
        item.active = false;
    }

    reset() {
        this.pool.forEach(item => item.active = false);
    }
}
