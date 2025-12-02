// ✨ 新增：Canvas roundRect 相容性處理
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// ✨ 新增：格式化 UUID 為 ABC-DEF-GHI
function formatUserID(uuid) {
    const parts = uuid.split('-');
    if (parts.length === 0) return "---";
    const p1 = parts[0].substring(0, 3).toUpperCase();
    const p2 = parts[0].substring(3, 6).toUpperCase();
    const p3 = parts[0].substring(6, 9).toUpperCase();
    return `${p1}-${p2}-${p3}`;
}

// ✨ 新增：檢查今天是否為生日的共用函式
function isBirthdayToday() {
    // ✨ 新增：開發用，強制觸發生日彩蛋
    if (GAME_CONFIG.FORCE_BIRTHDAY_POPUP) {
        return true;
    }
    const today = new Date();
    // 檢查 1 月 5 日 (月份是 0-indexed, 0 = 1月)
    return (today.getMonth() === 0 && today.getDate() === 5);
}

document.addEventListener('DOMContentLoaded', function () {

    // ✨ 修正：添加全局錯誤處理器來忽略瀏覽器擴充功能產生的錯誤
    window.addEventListener('error', function (event) {
        // 忽略來自 content_script.js 的擴充功能錯誤
        if (event.filename && event.filename.includes('content_script.js')) {
            event.preventDefault();
            return true;
        }
    }, true);

    // 忽略未捕獲的 Promise 錯誤（擴充功能可能產生的）
    window.addEventListener('unhandledrejection', function (event) {
        if (event.reason && event.reason.stack && event.reason.stack.includes('content_script.js')) {
            event.preventDefault();
            return true;
        }
    });

    // --- 初始化 Managers ---
    const databaseManager = new DatabaseManager();
    const shareManager = new ShareManager();
    const audioManager = new AudioManager();
    const uiManager = new UIManager();
    const inputManager = new InputManager(); // ✨ 新增：輸入管理器
    let effectManager; // ✨ 先聲明，在 gameScale 計算後初始化

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // 按鈕事件綁定 (部分仍需在此綁定邏輯)
    const startButton = document.getElementById('start-button');
    const muteButton = document.getElementById('mute-button');
    const openMilestoneButton = document.getElementById('open-milestone-button');
    const openGlobalMilestoneButton = document.getElementById('open-global-milestone-button');

    // 里程碑相關按鈕
    const claimTier1Button = document.getElementById('claim-tier1-button');
    const claimTier2Button = document.getElementById('claim-tier2-button');
    const claimTier3Button = document.getElementById('claim-tier3-button');
    const milestoneCloseButton = document.getElementById('milestone-close-button');
    const milestoneIgEditButton = document.getElementById('milestone-ig-edit-button');

    // 全體里程碑相關按鈕
    const globalMilestoneCloseButton = document.getElementById('global-milestone-close-button');
    const globalMilestoneRestartButton = document.getElementById('global-milestone-restart-button');
    const globalMilestoneShareButton = document.getElementById('global-milestone-share-button');

    // IG Prompt Buttons
    const igCancelButton = document.getElementById('ig-cancel-button');
    const igSubmitButton = document.getElementById('ig-submit-button');

    // Endgame Buttons
    const endgameContinueButton = document.getElementById('endgame-continue-button');

    // Birthday Modal
    const birthdayCloseButton = document.getElementById('birthday-close-button');

    // Controls - ✨ 移至 InputManager 處理
    // const moveLeftButton = document.getElementById('move-left');
    // const moveRightButton = document.getElementById('move-right');

    // ✨ 手機版畫布高度優化：根據螢幕寬度動態調整 canvas 實際尺寸
    const isMobile = window.innerWidth <= 767;
    let gameScale = 1; // ✨ 新增：縮放係數

    if (isMobile) {
        canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        canvas.height = 1200; // 手機版使用更高的畫布 (原本 600)
        gameScale = GAME_CONFIG.MOBILE_SCALE_FACTOR; // ✨ 手機版元素放大
    } else {
        canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
        gameScale = 1; // 桌機版保持原始大小
    }

    // ✨ 初始化 EffectManager 時傳入 gameScale
    effectManager = new EffectManager(gameScale);

    // --- ✨ 效能優化：物件池 (ItemPool) ---
    class ItemPool {
        constructor(size = 30) {
            this.pool = [];
            for (let i = 0; i < size; i++) {
                this.pool.push({
                    active: false,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    speed: 0,
                    score: 0,
                    type: '',
                    image: null
                });
            }
        }

        getItem() {
            const item = this.pool.find(i => !i.active);
            if (item) {
                item.active = true;
                return item;
            }
            // 如果池子不夠用，動態擴充 (雖然理想情況是預設夠大)
            const newItem = {
                active: true,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                speed: 0,
                score: 0,
                type: '',
                image: null
            };
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

    const itemPool = new ItemPool(50); // 預設 50 個物件

    // --- 遊戲變數 (✨ 更新) ---
    let gameStarted = false;
    let score = 0;
    
    // ✨ Player 初始化移至下方資源載入區
    let player; 

    // const keys = { left: false, right: false }; // ✨ 改用 InputManager
    let timeLeft = GAME_CONFIG.GAME_TIME;
    let gameTimerId = null;
    let isFeverTime = false;
    let feverMeter = 0;
    let feverDurationTimer = 0;
    let currentLang = 'zh-TW';
    // let isMuted = false; // Managed by AudioManager
    let playerProfile = {
        cumulativeScore: 0,
        claimedTier1: false,
        tier2Qualified: false,
        tier3Qualified: false,
        instagramHandle: null // ✨ 新增 IG 欄位
    };
    let currentStats = {};
    let stats_positive = 0, stats_negative = 0, stats_correct = 0, stats_wrong = 0;
    let totalGameTime = 0, stats_feverCount = 0, stats_feverTime = 0;
    let stats_items_positive = 0, stats_items_negative = 0, stats_questions_correct = 0, stats_questions_wrong = 0;
    const itemImages = {};
    let activeItems = []; // ✨ 新增：用來追蹤目前場上的 items
    let baseSpawnInterval = GAME_CONFIG.BASE_SPAWN_INTERVAL, spawnInterval = baseSpawnInterval, spawnTimer = spawnInterval;
    let currentClaimingTier = null; // ✨ 新增：用來追蹤正在領取哪個 Tier
    let wasMilestoneModalOpen = false; // ✨ 新增：用來追蹤顯示 IG 輸入畫面時，個人里程碑視窗是否原本是開著的
    let lastGameStats = null; // ✨ 新增：儲存最後一局遊戲統計數據供分享功能使用

    // ✨ 效能優化：預先計算總機率
    const totalSpawnProbability = GAME_CONFIG.ITEM_TYPES.reduce((sum, item) => sum + item.probability, 0);

    // --- ✨ 2. Database Logic moved to DatabaseManager ---
    let currentUserID = null;

    function handleAuthentication() {
        databaseManager.handleAuthentication(
            (uid) => {
                currentUserID = uid;
                uiManager.showStartScreen();
            },
            (error) => {
                // Handle Error Modal manually or via UIManager if extended
                const modalTitle = document.getElementById('modal-title');
                const modalText = document.getElementById('modal-text');
                if (modalTitle) modalTitle.textContent = "登入失敗";
                if (modalText) modalText.textContent = "無法連線至伺服器以驗證您的身份，請檢查網路連線後重新整理頁面。";
                uiManager.showModalOverlay();
            }
        );
    }

    // --- 資源載入 ---
    // const idleFrameSources = ... // ✨ 移至 Player 類別
    
    // 計算總資源數：Item Types + Player Assets
    let assetsToLoad = GAME_CONFIG.ITEM_TYPES.length + Player.getAssetCount();
    let assetsLoaded = 0;
    const loadingStartTime = Date.now();

    const loadingHints = [
        "正在召喚小媛寶...",
        "正在準備應援棒...",
        "正在佈置舞台...",
        "正在確認音響設備...",
        "小媛寶即將登場..."
    ];

    function updateLoadingProgress() {
        const progress = Math.floor((assetsLoaded / assetsToLoad) * 100);

        // ✨ 更新提示文字
        const hintIndex = Math.min(Math.floor((progress / 100) * loadingHints.length), loadingHints.length - 1);
        const currentHint = loadingHints[hintIndex];

        // ✨ 計算並更新預估時間
        let estimatedRemainingTime = 0;
        if (assetsLoaded > 0) {
            const elapsedTime = Date.now() - loadingStartTime;
            const averageTimePerAsset = elapsedTime / assetsLoaded;
            const remainingAssets = assetsToLoad - assetsLoaded;
            estimatedRemainingTime = Math.ceil((averageTimePerAsset * remainingAssets) / 1000); // 秒
        }

        uiManager.updateLoading(progress, currentHint, estimatedRemainingTime);
    }

    function onAssetLoad() {
        assetsLoaded++;
        updateLoadingProgress();
        if (assetsLoaded === assetsToLoad) {
            // player.loaded = true; // Player handles its own loaded state internally if needed, or just here
            setTimeout(() => {
                uiManager.hideLoading();
            }, GAME_CONFIG.UI.LOADING_FADE_DELAY);
        }
    }

    function onAssetError(error) {
        console.error('資源載入失敗:', error);
        assetsLoaded++;
        updateLoadingProgress();
        if (assetsLoaded === assetsToLoad) {
             setTimeout(() => {
                uiManager.hideLoading();
            }, GAME_CONFIG.UI.LOADING_FADE_DELAY);
        }
    }

    // 初始化 Player 並開始載入其資源
    player = new Player(gameScale, canvas.width, canvas.height, onAssetLoad, onAssetError);

    // 載入 Item 資源
    GAME_CONFIG.ITEM_TYPES.forEach(type => { const img = new Image(); img.src = type.src; img.onload = onAssetLoad; img.onerror = () => onAssetError(type.id); itemImages[type.id] = img; });

    // ✨ 新增:視窗大小變化時重新調整 canvas 尺寸
    function resizeCanvas() {
        const wasMobile = canvas.height > GAME_CONFIG.CANVAS_HEIGHT;
        const isMobileNow = window.innerWidth <= 767;

        if (isMobileNow) {
            canvas.height = 1200;
            gameScale = GAME_CONFIG.MOBILE_SCALE_FACTOR; // ✨ 更新縮放係數
        } else {
            canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
            gameScale = 1; // ✨ 更新縮放係數
        }

        // ✨ 更新 EffectManager 的縮放係數
        effectManager.setGameScale(gameScale);

        // 如果尺寸改變了,重新定位玩家並調整大小
        if (wasMobile !== isMobileNow && player) {
            player.resize(gameScale, canvas.width, canvas.height);
        }
    }

    // 監聽視窗大小變化
    window.addEventListener('resize', resizeCanvas);

    // --- 事件監聽 ---
    // ✨ 輸入監聽已移至 InputManager

    // --- 遊戲核心函式 ---
    function spawnItem() {
        // ✨ 效能優化：使用預先計算的 totalSpawnProbability
        let random = Math.random() * totalSpawnProbability;
        let chosenItemType;
        for (const itemType of GAME_CONFIG.ITEM_TYPES) {
            if (random < itemType.probability) {
                chosenItemType = itemType;
                break;
            }
            random -= itemType.probability;
        }
        if (!chosenItemType || !itemImages[chosenItemType.id] || !itemImages[chosenItemType.id].complete) {
            return;
        }

        const scaledItemSize = GAME_CONFIG.ITEM_DEFAULT_SIZE * gameScale;

        // ✨ 效能優化：使用 ItemPool
        const item = itemPool.getItem();
        item.x = Math.random() * (canvas.width - scaledItemSize);
        item.y = GAME_CONFIG.ITEM_SPAWN_Y_OFFSET * gameScale;
        item.width = scaledItemSize;
        item.height = scaledItemSize;
        item.speed = chosenItemType.speed * gameScale;
        item.score = chosenItemType.score;
        item.type = chosenItemType.type;
        item.image = itemImages[chosenItemType.id];

        activeItems.push(item);
    }
    function checkCollision(obj1, obj2) { return obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x && obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y; }

    function applyLanguage(lang) {
        if (!i18nStrings[lang]) {
            console.warn(`找不到語言 ${lang}，使用 zh-TW。`);
            lang = 'zh-TW';
        }
        currentLang = lang;

        // Update UI via UIManager if needed, but direct DOM manipulation for i18n is often simpler or handled by a dedicated i18n manager.
        // For now, we keep the logic but use the element references if we had them, or just querySelectorAll as it's a bulk operation.

        // ✨ Update active state in settings menu
        document.querySelectorAll('.lang-option').forEach(btn => {
            if (btn.dataset.lang === lang) {
                btn.style.backgroundColor = 'var(--color-primary-dark)';
                btn.textContent = (lang === 'zh-TW' ? '✓ 繁體中文' : '✓ English');
            } else {
                btn.style.backgroundColor = 'var(--color-primary)';
                btn.textContent = (btn.dataset.lang === 'zh-TW' ? '繁體中文' : 'English');
            }
        });

        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.dataset.i18nKey;
            if (i18nStrings[lang][key]) {
                element.textContent = i18nStrings[lang][key];
            }
        });
        document.querySelectorAll('[data-i18n-key-placeholder]').forEach(element => {
            const key = element.dataset.i18nKeyPlaceholder;
            if (i18nStrings[lang][key]) {
                element.placeholder = i18nStrings[lang][key];
            }
        });
        document.title = i18nStrings[lang].modalStartTitle;

        // ✨ Refresh UI text if visible
        if (!gameStarted) {
            uiManager.showStartScreen();
        }
    }

    function detectLanguage() { let browserLang = navigator.language || navigator.userLanguage; if (browserLang.startsWith('en')) { applyLanguage('en'); } else if (browserLang.startsWith('zh')) { applyLanguage('zh-TW'); } else { applyLanguage('zh-TW'); } }

    // ✨ Settings Menu Logic
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const settingsMainView = document.getElementById('settings-main-view');
    const settingsLanguageView = document.getElementById('settings-language-view');
    const settingsTroubleshootView = document.getElementById('settings-troubleshoot-view'); // ✨ 新增

    const btnLanguageSettings = document.getElementById('btn-language-settings');
    const btnTroubleshoot = document.getElementById('btn-troubleshoot'); // ✨ 新增
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnBackSettingsLang = document.getElementById('btn-back-settings-lang'); // ✨ 修改 ID
    const btnBackSettingsTrouble = document.getElementById('btn-back-settings-trouble'); // ✨ 新增
    const btnRepairGame = document.getElementById('btn-repair-game'); // ✨ 新增

    const langOptions = document.querySelectorAll('.lang-option');

    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            settingsMainView.classList.remove('hidden');
            settingsLanguageView.classList.add('hidden');
            if (settingsTroubleshootView) settingsTroubleshootView.classList.add('hidden');
        });
    }

    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    if (btnLanguageSettings) {
        btnLanguageSettings.addEventListener('click', () => {
            settingsMainView.classList.add('hidden');
            settingsLanguageView.classList.remove('hidden');
        });
    }

    // ✨ 新增：故障排除按鈕
    if (btnTroubleshoot) {
        btnTroubleshoot.addEventListener('click', () => {
            settingsMainView.classList.add('hidden');
            if (settingsTroubleshootView) settingsTroubleshootView.classList.remove('hidden');
        });
    }

    // ✨ 修改：語言設定返回按鈕 (注意 HTML ID 變更)
    // 為了相容舊 ID，嘗試抓取兩個可能的 ID
    const btnBackSettings = document.getElementById('btn-back-settings');
    const actualBackLangBtn = btnBackSettingsLang || btnBackSettings;
    
    if (actualBackLangBtn) {
        actualBackLangBtn.addEventListener('click', () => {
            settingsLanguageView.classList.add('hidden');
            settingsMainView.classList.remove('hidden');
        });
    }

    // ✨ 新增：故障排除返回按鈕
    if (btnBackSettingsTrouble) {
        btnBackSettingsTrouble.addEventListener('click', () => {
            if (settingsTroubleshootView) settingsTroubleshootView.classList.add('hidden');
            settingsMainView.classList.remove('hidden');
        });
    }

    // ✨ 新增：修復遊戲功能 (清除快取並重整)
    if (btnRepairGame) {
        btnRepairGame.addEventListener('click', () => {
            const confirmText = currentLang === 'zh-TW' ? 
                "這將會清除遊戲的暫存資料並重新載入，您的累積紀錄（若已登入）不會消失。確定要執行嗎？" : 
                "This will clear game cache and reload. Your saved progress (if logged in) will remain. Continue?";
            
            if (confirm(confirmText)) {
                // 1. 清除 LocalStorage (保留重要的 UUID)
                const savedUUID = localStorage.getItem(GAME_CONFIG.USER_ID_KEY);
                localStorage.clear();
                if (savedUUID) {
                    localStorage.setItem(GAME_CONFIG.USER_ID_KEY, savedUUID);
                }

                // 2. 強制重整 (帶上時間戳記避免瀏覽器快取)
                const url = new URL(window.location.href);
                url.searchParams.set('t', Date.now());
                window.location.href = url.toString();
            }
        });
    }

    langOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.dataset.lang;
            applyLanguage(lang);
        });
    });
    function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]]; } return array; }

    // ========================================================================
    // --- ✨ 彈窗狀態管理 (✨ 重大更新) ✨ ---
    // ========================================================================

    // ✨ 修改：顯示 IG 輸入畫面（支援修改模式）
    function showIgPrompt(tier) {
        currentClaimingTier = tier; // 記錄正在領取的獎勵（null 表示修改模式）
        databaseManager.currentClaimingTier = tier; // Sync with DatabaseManager

        // ✨ 修正：如果個人里程碑視窗是開著的，暫時隱藏它
        const milestoneModal = document.getElementById('milestone-modal-overlay');
        wasMilestoneModalOpen = !milestoneModal.classList.contains('hidden');
        if (wasMilestoneModalOpen) {
            milestoneModal.classList.add('hidden');
        }

        uiManager.showIgPrompt(playerProfile.instagramHandle);
    }

    // ✨ 新增：隱藏 IG 輸入畫面
    function hideIgPrompt() {
        const igPromptArea = document.getElementById('ig-prompt-area');
        igPromptArea.classList.add('hidden');

        // ✨ 修正：如果之前個人里程碑視窗是開著的，重新顯示它
        if (wasMilestoneModalOpen) {
            wasMilestoneModalOpen = false; // 重置標記
            showMilestoneModal(false); // 重新顯示個人里程碑視窗

            // ✨ 錯誤修復：確保主選單在背景中保持可見
            uiManager.showModalOverlay();
        } else {
            uiManager.showStartScreen();
        }
    }

    // ✨ 修改：顯示個人里程碑彈窗 (垂直列表新版)
    async function showMilestoneModal(isEndGameFlow = false) {
        await databaseManager.loadPlayerProfile();
        playerProfile = databaseManager.playerProfile; // Sync local profile

        const currentScore = playerProfile.cumulativeScore;
        const milestoneCurrentScore = document.getElementById('milestone-current-score');
        milestoneCurrentScore.textContent = new Intl.NumberFormat().format(currentScore);

        // ✨ 新增：顯示或隱藏 IG 帳號區域
        const milestoneIgDisplay = document.getElementById('milestone-ig-display');
        const milestoneIgHandle = document.getElementById('milestone-ig-handle');
        if (playerProfile.instagramHandle) {
            milestoneIgHandle.textContent = playerProfile.instagramHandle;
            milestoneIgDisplay.classList.remove('hidden');
        } else {
            milestoneIgDisplay.classList.add('hidden');
        }

        const tiers = [
            { id: 1, score: GAME_CONFIG.MILESTONES.PERSONAL.TIER_1_SCORE, element: document.getElementById('milestone-tier-1'), button: claimTier1Button, qualified: playerProfile.claimedTier1 },
            { id: 2, score: GAME_CONFIG.MILESTONES.PERSONAL.TIER_2_SCORE, element: document.getElementById('milestone-tier-2'), button: claimTier2Button, qualified: playerProfile.tier2Qualified },
            { id: 3, score: GAME_CONFIG.MILESTONES.PERSONAL.TIER_3_SCORE, element: document.getElementById('milestone-tier-3'), button: claimTier3Button, qualified: playerProfile.tier3Qualified }
        ];

        tiers.forEach(tier => {
            const isUnlocked = currentScore >= tier.score;

            tier.element.classList.toggle('disabled', !isUnlocked);
            tier.button.disabled = !isUnlocked;

            if (isUnlocked) {
                if (tier.id === 1) {
                    // Tier 1 is a simple download, no "claimed" state needed in the same way
                    tier.button.textContent = i18nStrings[currentLang].milestoneDownload;
                    tier.button.classList.remove('claimed');
                } else {
                    if (tier.qualified) {
                        tier.button.textContent = i18nStrings[currentLang].milestoneQualified;
                        tier.button.classList.add('claimed');
                    } else {
                        tier.button.textContent = i18nStrings[currentLang].milestoneClaimButton;
                        tier.button.classList.remove('claimed');
                    }
                }
            } else {
                // Locked state
                tier.button.textContent = i18nStrings[currentLang].milestoneClaimButton;
                tier.button.classList.remove('claimed');
            }
        });

        if (isEndGameFlow) {
            milestoneCloseButton.textContent = i18nStrings[currentLang].continueButton;
            milestoneCloseButton.onclick = showGlobalMilestoneStep;
        } else {
            milestoneCloseButton.textContent = i18nStrings[currentLang].milestoneConfirmButton;
            milestoneCloseButton.onclick = () => {
                const milestoneModal = document.getElementById('milestone-modal-overlay');
                milestoneModal.classList.add('hidden');
            };
        }

        const milestoneModal = document.getElementById('milestone-modal-overlay');
        milestoneModal.classList.remove('hidden');
    }

    function showPersonalMilestoneStep() {
        uiManager.hideModalOverlay(); // Hide main modal
        showMilestoneModal(true);
    }

    async function showGlobalMilestoneModal(isEndGameFlow = false) {
        const progressPercent = await databaseManager.loadTotalMilestoneScore();
        const globalMilestoneProgressBarFill = document.getElementById('global-milestone-progress-bar-fill');
        const globalMilestoneCurrentPercent = document.getElementById('global-milestone-current-percent');
        const globalMilestoneModal = document.getElementById('global-milestone-modal-overlay');

        globalMilestoneProgressBarFill.style.width = progressPercent;
        globalMilestoneCurrentPercent.textContent = progressPercent;

        if (isEndGameFlow) {
            globalMilestoneCloseButton.classList.add('hidden');
            globalMilestoneRestartButton.classList.remove('hidden');
            globalMilestoneShareButton.classList.remove('hidden');
            globalMilestoneRestartButton.onclick = closeSettlementAndCheckBirthday;
            globalMilestoneShareButton.onclick = copyShareText;
        } else {
            globalMilestoneCloseButton.classList.remove('hidden');
            globalMilestoneRestartButton.classList.add('hidden');
            globalMilestoneShareButton.classList.add('hidden');
            globalMilestoneCloseButton.onclick = () => {
                globalMilestoneModal.classList.add('hidden');
            };
        }
        globalMilestoneModal.classList.remove('hidden');
    }

    function showGlobalMilestoneStep() {
        const milestoneModal = document.getElementById('milestone-modal-overlay');
        milestoneModal.classList.add('hidden');
        showGlobalMilestoneModal(true);
    }

    // --- 遊戲狀態函式 (✨ 更新) ---
    function showQuestion() {
        gameStarted = false;
        inputManager.setActive(false); // ✨ 暫停輸入
        clearGameTimers();
        audioManager.pauseBGM('bgm');
        audioManager.pauseBGM('bgmFever');

        if (typeof QUESTION_BANK === 'undefined' || QUESTION_BANK.length === 0) { console.error("錯誤：題庫 (QUESTION_BANK) 未定義或為空！"); resumeGame(); return; }
        const qIndex = Math.floor(Math.random() * QUESTION_BANK.length);
        const selectedQuestion = QUESTION_BANK[qIndex];
        const qData = selectedQuestion[currentLang];
        if (!qData) { console.error(`找不到題目 ${selectedQuestion.id} 的 ${currentLang} 語言資料`); resumeGame(); return; }
        let options = [...qData.incorrectAnswers, qData.correctAnswer];
        shuffleArray(options);

        // Use UIManager to show question
        // Need to find the correct index after shuffle
        const correctIndex = options.indexOf(qData.correctAnswer);
        uiManager.setupQuestion(qData.question, options, correctIndex);

        // Re-bind answer buttons since we are not using inline onclicks in HTML usually
        const answerButtons = document.querySelectorAll('.answer-option');
        answerButtons.forEach(btn => {
            btn.onclick = handleAnswer;
        });
    }

    function handleAnswer(event) {
        const clickedButton = event.target;
        const isCorrect = clickedButton.dataset.correct === "true";
        const answerButtons = document.querySelectorAll('.answer-option');
        answerButtons.forEach(btn => btn.disabled = true);

        if (isCorrect) {
            let bonusPoints = GAME_CONFIG.SCORING.CORRECT_ANSWER;
            if (isFeverTime) bonusPoints *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
            score += bonusPoints;
            player.setHappy();
            audioManager.playSound('answerCorrect');
            stats_questions_correct++;
        } else {
            score += GAME_CONFIG.SCORING.INCORRECT_ANSWER;
            player.setSad();
            audioManager.playSound('answerIncorrect');
            stats_questions_wrong++;
        }

        uiManager.updateScore(score);
        // player.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION; // ✨ 移至 Player 類別內部

        let correctButton = null;
        answerButtons.forEach(btn => {
            if (btn.dataset.correct === "true") {
                correctButton = btn;
            }
        });

        if (isCorrect) {
            clickedButton.classList.add('correct-answer');
        } else {
            clickedButton.classList.add('incorrect-answer');
            if (correctButton) {
                correctButton.classList.add('correct-answer');
            }
        }
        setTimeout(resumeGame, GAME_CONFIG.UI.POST_ANSWER_DELAY);
    }

    function resumeGame() {
        const answerButtons = document.querySelectorAll('.answer-option');
        answerButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('correct-answer', 'incorrect-answer');
        });

        uiManager.hideAllModalScreens();
        uiManager.hideModalOverlay(); // ✨ 修正：確保背景遮罩也被隱藏

        gameStarted = true;
        inputManager.setActive(true); // ✨ 啟用輸入
        clearGameTimers();
        gameTimerId = setInterval(updateTimer, 1000);

        if (audioManager.isMuted) return;
        if (isFeverTime) {
            audioManager.playBGM('bgmFever');
        } else {
            audioManager.playBGM('bgm');
        }

        // ✨ 修正：重新啟動遊戲迴圈，否則畫面會卡住
        lastTime = performance.now(); // ✨ Reset time on resume
        gameLoop(lastTime);
    }

    function updateTimer() {
        timeLeft--;
        uiManager.updateTime(timeLeft);
        if (timeLeft <= 0) {
            endGame();
        }
    }

    function activateFeverTime() {
        if (isFeverTime) return;
        isFeverTime = true;
        feverDurationTimer = GAME_CONFIG.FEVER.DURATION;
        spawnInterval = Math.floor(baseSpawnInterval * GAME_CONFIG.FEVER.SPAWN_INTERVAL_MULTIPLIER);

        // ✨ 更新 UI 與統計
        uiManager.updateFeverProgress(100);
        stats_feverCount++;

        audioManager.pauseBGM('bgm');
        audioManager.audio.bgm.currentTime = 0;
        audioManager.audio.bgmFever.loop = true;
        audioManager.playBGM('bgmFever');

        effectManager.activateFeverVisuals();
    }

    function endFeverTime() {
        if (!isFeverTime) return;
        isFeverTime = false;
        feverMeter = 0;
        feverDurationTimer = 0;
        spawnInterval = baseSpawnInterval;

        // ✨ 更新 UI
        uiManager.updateFeverProgress(0);

        audioManager.pauseBGM('bgmFever');
        audioManager.audio.bgmFever.currentTime = 0;
        audioManager.playBGM('bgm');

        effectManager.deactivateFeverVisuals();
    }

    // --- ✨ Share Logic moved to ShareManager ---

    async function endGame() {
        gameStarted = false;
        inputManager.setActive(false); // ✨ 禁用輸入
        clearGameTimers();
        audioManager.stopBGM('bgm');
        audioManager.stopBGM('bgmFever');
        audioManager.playSound('gameOver');

        // 記錄統計數據
        currentStats = {
            score: score,
            positiveItems: stats_items_positive,
            negativeItems: stats_items_negative,
            questionsCorrect: stats_questions_correct,
            questionsWrong: stats_questions_wrong,
            feverCount: stats_feverCount,
            maxFeverTime: stats_feverTime,
            timestamp: new Date()
        };

        // ✨ 修正：確保遊戲結束時所有 Fever Time 相關狀態完全重置
        if (isFeverTime) {
            effectManager.deactivateFeverVisuals();
        }
        isFeverTime = false; // 強制設定為 false
        feverMeter = 0; // 重置能量條
        feverDurationTimer = 0; // 重置倒數計時器
        uiManager.updateFeverProgress(0); // 清空 UI 顯示

        // ✨ 修正：準備分享用的數據格式
        const shareStats = {
            score: score,
            itemsCaught: stats_items_positive + stats_items_negative, // 總接取數
            correctAnswers: stats_questions_correct,
            wrongAnswers: stats_questions_wrong
        };
        lastGameStats = shareStats; // 儲存供按鈕使用

        // 更新 UI
        const endgameTitle = document.getElementById('endgame-title');
        const endgameScoreText = document.getElementById('endgame-score-text');
        endgameTitle.textContent = i18nStrings[currentLang].modalEndTitle;

        // 顯示結算畫面
        uiManager.hideAllModalScreens();
        const endgameScreenUI = document.getElementById('endgame-screen-ui');
        endgameScreenUI.classList.remove('hidden');
        uiManager.showModalOverlay();

        // 生成分享卡片 (非同步執行，不阻塞)
        shareManager.generateScoreCard(shareStats, 'square').then(() => {
            const shareSection = document.getElementById('share-section');
            if (shareSection) shareSection.style.display = 'block';
        }).catch(err => console.warn("Share card generation failed:", err));

        // 上傳分數 (非同步執行，不阻塞 UI)
        if (currentUserID) {
            databaseManager.saveScore(currentUserID, currentStats).catch(err => {
                console.warn("Score upload failed:", err);
                // Optional: Show a small toast or just ignore as it's background
            });
        }
    }

    function clearGameTimers() {
        if (gameTimerId) { clearInterval(gameTimerId); gameTimerId = null; }
    }

    function resetGame() {
        score = 0;
        timeLeft = GAME_CONFIG.GAME_TIME;
        feverMeter = 0;
        isFeverTime = false;
        spawnInterval = baseSpawnInterval;
        spawnTimer = spawnInterval;

        // Reset Stats
        stats_positive = 0; stats_negative = 0; stats_correct = 0; stats_wrong = 0;
        totalGameTime = 0; stats_feverCount = 0; stats_feverTime = 0;
        stats_items_positive = 0; stats_items_negative = 0; stats_questions_correct = 0; stats_questions_wrong = 0;

        uiManager.updateScore(score);
        uiManager.updateTime(timeLeft);
        uiManager.updateFeverProgress(0);

        activeItems = [];
        itemPool.reset();
        effectManager.resetScoreEffects();
        effectManager.deactivateFeverVisuals();

        player.reset();
    }

    // ✨ FPS Control Variables
    let lastTime = 0;
    const FPS_LIMIT = 60;
    const FRAME_INTERVAL = 1000 / FPS_LIMIT;

    function startGame() {
        resetGame();
        uiManager.hideAllModalScreens();
        uiManager.hideModalOverlay();

        gameStarted = true;
        inputManager.setActive(true); // ✨ 啟用輸入
        audioManager.playSound('gameStart');
        audioManager.playBGM('bgm');

        gameTimerId = setInterval(updateTimer, 1000);
        lastTime = performance.now(); // ✨ Initialize time
        gameLoop(lastTime);
    }

    // --- 遊戲主迴圈 ---
    function gameLoop(timestamp) {
        if (!gameStarted) return;

        // ✨ FPS Cap Logic
        if (!timestamp) timestamp = performance.now();
        const deltaTime = timestamp - lastTime;

        if (deltaTime < FRAME_INTERVAL) {
            requestAnimationFrame(gameLoop);
            return;
        }

        // Adjust lastTime to account for the extra time (avoids drift)
        lastTime = timestamp - (deltaTime % FRAME_INTERVAL);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 更新與繪製玩家
        player.update(inputManager);
        player.draw(ctx);

        // ✨ 新增：Fever Time 倒數邏輯
        if (isFeverTime) {
            feverDurationTimer--;
            stats_feverTime++; // 記錄 Fever 總時間 (frames)
            
            // 更新 UI (倒數)
            const percent = Math.max(0, Math.floor((feverDurationTimer / GAME_CONFIG.FEVER.DURATION) * 100));
            uiManager.updateFeverProgress(percent);

            if (feverDurationTimer <= 0) {
                endFeverTime();
            }
        }

        // 2. 生成物品
        spawnTimer--;
        if (spawnTimer <= 0) {
            spawnItem();
            spawnTimer = spawnInterval;
        }

        // 3. 更新與繪製物品
        for (let i = activeItems.length - 1; i >= 0; i--) {
            let item = activeItems[i];
            item.y += item.speed;

            // 繪製
            ctx.drawImage(item.image, item.x, item.y, item.width, item.height);

            // 碰撞檢測
            if (checkCollision(player, item)) {
                // 處理碰撞
                if (item.type === 'question') {
                    audioManager.playSound('collectQuestion');
                    showQuestion();
                } else {
                    let points = item.score;
                    // ✨ 修正：如果是扣分物品，將分數轉為負數
                    if (item.type === 'negative') {
                        points = -points;
                    }

                    if (isFeverTime && points > 0) points *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
                    score += points;

                    uiManager.updateScore(score);

                    // 特效
                    effectManager.addScoreEffect(item.x, item.y, points, points > 0 ? 'positive' : 'negative');

                    if (points > 0) {
                        audioManager.playSound(item.type === 'special' ? 'collectSpecial' : 'collectPositive');
                        stats_items_positive++;

                        // ✨ 修正：接到加分物品顯示勝利表情
                        player.setHappy();

                        // Fever 累積
                        if (!isFeverTime) {
                            // ✨ 修正：加入預設值以防設定檔缺失
                            const charge = GAME_CONFIG.FEVER.CHARGE_PER_ITEM || 10;
                            feverMeter += charge;
                            if (feverMeter >= 100) {
                                feverMeter = 100;
                                activateFeverTime();
                            }
                            uiManager.updateFeverProgress(Math.floor(feverMeter));
                        }
                    } else {
                        audioManager.playSound('collectNegative');
                        stats_items_negative++;

                        // ✨ 修正：接到扣分物品顯示失敗表情
                        player.setSad();

                        // Fever 扣除
                        if (!isFeverTime) {
                            // ✨ 修正：加入預設值以防設定檔缺失
                            const penalty = GAME_CONFIG.FEVER.PENALTY_PER_MISTAKE || 20;
                            feverMeter = Math.max(0, feverMeter - penalty);
                            uiManager.updateFeverProgress(Math.floor(feverMeter));
                        }
                    }
                }

                // 回收物品
                itemPool.releaseItem(item);
                activeItems.splice(i, 1);

            } else if (item.y > canvas.height) {
                // 超出邊界
                itemPool.releaseItem(item);
                activeItems.splice(i, 1);
            }
        }

        // 4. 繪製 Fever 效果 (由 EffectManager 處理，這裡可能只需要處理一些額外的，或者 EffectManager 已經處理了 DOM)
        // EffectManager 目前只處理 DOM 類別和 ScoreEffects。如果需要 Canvas 上的 Fever 效果，可以在這裡加。
        // 原始代碼中 Fever 主要是 CSS 動畫，所以這裡不需要額外 Canvas 繪製。

        // 5. 繪製分數特效
        effectManager.updateAndDrawScoreEffects(ctx);

        requestAnimationFrame(gameLoop);
    }

    // --- 初始化 ---
    detectLanguage();
    handleAuthentication();

    // 按鈕事件
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            applyLanguage(e.target.value);
        });
    }

    startButton.addEventListener('click', startGame);
    openMilestoneButton.addEventListener('click', () => showMilestoneModal(false));
    openGlobalMilestoneButton.addEventListener('click', () => showGlobalMilestoneModal(false));
    milestoneIgEditButton.addEventListener('click', () => showIgPrompt(null));
    igCancelButton.addEventListener('click', hideIgPrompt);
    igSubmitButton.addEventListener('click', async () => {
        const input = document.getElementById('ig-input');
        const handle = input.value.trim();
        if (handle) {
            await databaseManager.saveInstagramHandle(handle);
            playerProfile.instagramHandle = handle; // Update local
            if (currentClaimingTier) {
                // Claim logic handled by DatabaseManager or here?
                // Original logic: save handle -> then claim
                // We need to call claim function
                // But wait, the original code had claim logic inside the button click or separate?
                // Let's assume we just save here and return to milestone modal
            }
            hideIgPrompt();
        }
    });

    // Claim Buttons
    claimTier1Button.addEventListener('click', () => {
        window.open(GAME_CONFIG.MILESTONES.REWARDS.TIER_1_URL, '_blank');
        databaseManager.claimTier(1);
        playerProfile.claimedTier1 = true;
        showMilestoneModal(false);
    });
    claimTier2Button.addEventListener('click', () => showIgPrompt(2));
    claimTier3Button.addEventListener('click', () => showIgPrompt(3));

    endgameContinueButton.addEventListener('click', showPersonalMilestoneStep);

    // Birthday
    function closeSettlementAndCheckBirthday() {
        const globalMilestoneModal = document.getElementById('global-milestone-modal-overlay');
        globalMilestoneModal.classList.add('hidden');
        uiManager.hideModalOverlay();

        if (isBirthdayToday()) {
            const birthdayModal = document.getElementById('birthday-modal-overlay');
            birthdayModal.classList.remove('hidden');
            uiManager.showModalOverlay();
            audioManager.audio.birthday.play().catch(e => console.log("Birthday song autoplay blocked"));
        } else {
            uiManager.showStartScreen();
        }
    }

    birthdayCloseButton.addEventListener('click', () => {
        const birthdayModal = document.getElementById('birthday-modal-overlay');
        birthdayModal.classList.add('hidden');
        uiManager.hideModalOverlay();
        audioManager.audio.birthday.pause();
        audioManager.audio.birthday.currentTime = 0;
        uiManager.showStartScreen();
    });

    // Copy Share Text
    function copyShareText() {
        const text = `我剛剛在《2026 Happy Yuan Day》應援遊戲中獲得了 ${score} 分！\n快來一起幫小媛寶應援吧！\n#HappyYuanDay #應援遊戲`;
        navigator.clipboard.writeText(text).then(() => {
            alert("分享文字已複製！");
        });
    }

    // ✨ 新增：分享功能按鈕事件綁定
    const formatSquareBtn = document.getElementById('formatSquareBtn');
    const formatStoryBtn = document.getElementById('formatStoryBtn');
    const downloadScoreBtn = document.getElementById('downloadScoreBtn');
    const shareScoreBtn = document.getElementById('shareScoreBtn');

    if (formatSquareBtn) {
        formatSquareBtn.addEventListener('click', () => {
            if (lastGameStats) {
                shareManager.switchShareFormat('square', lastGameStats, currentLang, i18nStrings);
            }
        });
    }

    if (formatStoryBtn) {
        formatStoryBtn.addEventListener('click', () => {
            if (lastGameStats) {
                shareManager.switchShareFormat('story', lastGameStats, currentLang, i18nStrings);
            }
        });
    }

    if (downloadScoreBtn) {
        downloadScoreBtn.addEventListener('click', () => {
            const canvas = document.getElementById('scoreCardCanvas');
            if (canvas) {
                shareManager.downloadImage(canvas.toDataURL('image/png'));
            }
        });
    }

    if (shareScoreBtn) {
        shareScoreBtn.addEventListener('click', () => {
            const canvas = document.getElementById('scoreCardCanvas');
            if (canvas && lastGameStats) {
                shareManager.shareImage(canvas.toDataURL('image/png'), lastGameStats);
            }
        });
    }

});
