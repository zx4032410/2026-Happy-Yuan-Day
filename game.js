// ✨ 新增：輔助函式 (放在檔案最頂部，DOMContentLoaded 之外)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
    const today = new Date();
    // 檢查 1 月 5 日 (月份是 0-indexed, 0 = 1月)
    return (today.getMonth() === 0 && today.getDate() === 5);
}

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 初始化 HTML 元素 (✨ 更新) ---
    const db = firebase.firestore(); 
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
// 全域 UI
    const langSelect = document.getElementById('lang-select');
    const userIdDisplay = document.getElementById('user-id-display');
    const copyIdButton = document.getElementById('copy-id-button');
    const muteButton = document.getElementById('mute-button');

    // 遊戲內 UI
    const scoreLabel = document.getElementById('score-label');
    const timeLabel = document.getElementById('time-label');
    const feverLabel = document.getElementById('fever-label');
    const scoreDisplay = document.getElementById('score-display');
    const timeDisplay = document.getElementById('time-display');
    const milestoneProgress = document.getElementById('milestone-progress');
    
    // 主彈窗
    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content'); // (v10 新增)
    const openImportButton = document.getElementById('open-import-button'); // (v10 新增)
    
    // 彈窗 1: 開始畫面
    const startScreenUI = document.getElementById('start-screen-ui');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const startButton = document.getElementById('start-button');
    
    // 彈窗 2: 結算畫面
    const endgameScreenUI = document.getElementById('endgame-screen-ui'); // (v10 新增)
    const endgameStats = document.getElementById('endgame-stats');
    const statsPositive = document.getElementById('stats-positive');
    const statsNegative = document.getElementById('stats-negative');
    const statsCorrect = document.getElementById('stats-correct');
    const statsWrong = document.getElementById('stats-wrong');
    const milestoneResultPercent = document.getElementById('milestone-result-percent');
    const milestoneResultDiv = document.getElementById('milestone-result');
    
    // 彈窗 3: 問答畫面
    const questionArea = document.getElementById('question-area');
    const questionText = document.getElementById('question-text');
    const answerButtons = document.querySelectorAll('.answer-option');

    // 彈窗 4: 匯入畫面 (v10 新增)
    const importUiArea = document.getElementById('import-ui-area');
    const importTitle = document.getElementById('import-title');
    const importText = document.getElementById('import-text');
    const importInput = document.getElementById('import-input');
    const importButton = document.getElementById('import-button');
    const importCancelButton = document.getElementById('import-cancel-button');
    
    // ✨ 新增：個人里程碑彈窗元素
    const openMilestoneButton = document.getElementById('open-milestone-button');
    const milestoneModal = document.getElementById('milestone-modal-overlay');
    const milestoneCloseButton = document.getElementById('milestone-close-button');
    const milestoneProgressBarFill = document.getElementById('milestone-progress-bar-fill');
    const milestoneCurrentScore = document.getElementById('milestone-current-score');
    const claimTier1Button = document.getElementById('claim-tier1-button');
    const claimTier2Button = document.getElementById('claim-tier2-button');
    const claimTier3Button = document.getElementById('claim-tier3-button');

    // ✨ 新增 (全體里程碑)
    const openGlobalMilestoneButton = document.getElementById('open-global-milestone-button');
    const globalMilestoneModal = document.getElementById('global-milestone-modal-overlay');
    const globalMilestoneProgressBarFill = document.getElementById('global-milestone-progress-bar-fill');
    const globalMilestoneCurrentPercent = document.getElementById('global-milestone-current-percent');
    const globalMilestoneCloseButton = document.getElementById('global-milestone-close-button');
    const globalMilestoneRestartButton = document.getElementById('global-milestone-restart-button');
    const globalMilestoneShareButton = document.getElementById('global-milestone-share-button');

    // ✨ 新增 (結算 Step 1)
    const endgameTitle = document.getElementById('endgame-title');
    const endgameScoreText = document.getElementById('endgame-score-text');
    const endgameContinueButton = document.getElementById('endgame-continue-button');

    // 彈窗 5: 生日彩蛋
    const birthdayModal = document.getElementById('birthday-modal-overlay');
    const birthdayMessage = document.getElementById('birthday-message');
    const birthdayCloseButton = document.getElementById('birthday-close-button');

    const moveLeftButton = document.getElementById('move-left');
    const moveRightButton = document.getElementById('move-right');

    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

    // --- 音效初始化區 (不變) ---
    const audio = {};
    // ... (省略音效 new Audio(...) 的程式碼) ...
    audio.bgm = new Audio('./audio/bgm.mp3'); audio.bgm.loop = true;
    audio.gameStart = new Audio('./audio/game-start.mp3');
    audio.gameOver = new Audio('./audio/game-over.mp3');
    audio.collectPositive = new Audio('./audio/collect-positive.mp3');
    audio.collectNegative = new Audio('./audio/collect-negative.mp3');
    audio.bgmFever = new Audio('./audio/bgm-fever.m4a');
    audio.collectSpecial = new Audio('./audio/collect-special.mp3');
    audio.collectQuestion = new Audio('./audio/collect-question.mp3');
    audio.answerCorrect = new Audio('./audio/answer-correct.mp3');
    audio.answerIncorrect = new Audio('./audio/answer-incorrect.mp3');
    // ✨ 新增：載入生日快樂 BGM
    audio.birthday = new Audio('./audio/Happy Birthday_8bit.mp3');
    audio.birthday.loop = true; // 設置為循環播放

    // --- 遊戲變數 (✨ 更新) ---
    let gameStarted = false;
    let score = 0;
    const player = { 
        /* ... (玩家物件不變) ... */ 
        x: canvas.width / 2 - GAME_CONFIG.PLAYER.WIDTH / 2, 
        y: canvas.height - GAME_CONFIG.PLAYER.Y_OFFSET, 
        width: GAME_CONFIG.PLAYER.WIDTH, 
        height: GAME_CONFIG.PLAYER.HEIGHT, 
        speed: GAME_CONFIG.PLAYER.SPEED, 
        image: new Image(), 
        defaultImage: new Image(), 
        winImage: new Image(), 
        loseImage: new Image(), 
        loaded: false, 
        animationTimer: 0,
        // ✨ 新增：動畫相關屬性
        currentFrame: 0, // 當前播放的幀索引
        frameCounter: 0,
        frameRate: GAME_CONFIG.PLAYER.ANIMATION_FRAME_RATE,   // 每 10 幀遊戲更新切換一次圖片 (數值越大，動畫越慢)
        idleFrames: [],  // 儲存動畫圖片物件的陣列
        // ...
    };
    const keys = { left: false, right: false };
    let timeLeft = GAME_CONFIG.GAME_TIME;
    let gameTimerId = null;
    let isFeverTime = false;
    let feverMeter = 0; 
    let feverDurationTimer = 0;
    let currentLang = 'zh-TW';
    let isMuted = false;
    // ✨ 新增：玩家個人資料 (預設值)
    let playerProfile = {
        cumulativeScore: 0,
        claimedTier1: false,
        tier2Qualified: false,
        tier3Qualified: false
    };
    // ✨ 新增：本局遊戲的統計資料
    let currentStats = {};
    // ✨ 修正：新增遊戲內部的統計數據追蹤變數 (解決 Uncaught ReferenceError)
    let stats_positive = 0;
    let stats_negative = 0;
    let stats_correct = 0;
    let stats_wrong = 0;
    let totalGameTime = 0;
    let stats_feverCount = 0;
    let stats_feverTime = 0;

    let stats_items_positive = 0, stats_items_negative = 0, stats_questions_correct = 0, stats_questions_wrong = 0;
    const itemImages = {};
    let fallingItems = [];
    let baseSpawnInterval = GAME_CONFIG.BASE_SPAWN_INTERVAL, spawnInterval = baseSpawnInterval, spawnTimer = spawnInterval;

    // --- 匿名 ID 邏輯 (v10) ---
    let currentUserID = null; 
    function getOrCreateUserID() {
        let userID = localStorage.getItem(GAME_CONFIG.USER_ID_KEY);
        if (!userID) {
            userID = generateUUID();
            localStorage.setItem(GAME_CONFIG.USER_ID_KEY, userID);
            console.log("新的匿名使用者 ID 已創建:", userID);
        } else {
            console.log("偵測到既有匿名使用者 ID:", userID);
        }
        return userID;
    }
    currentUserID = getOrCreateUserID();
    userIdDisplay.textContent = formatUserID(currentUserID); // 更新全域 UI

    // --- 資源載入 ---
    // ✨ 步驟 1：先定義所有要載入的動畫幀
    const idleFrameSources = [
        './images/xiao-yuan-bao-idle-1.png',
        './images/xiao-yuan-bao-idle-2.png',
        './images/xiao-yuan-bao-idle-3.png',
        './images/xiao-yuan-bao-idle-4.png', 
        './images/xiao-yuan-bao-idle-5.png',
        './images/xiao-yuan-bao-idle-6.png'
    ];
    // ✨ 步驟 2：現在才計算總資源數
    let assetsToLoad = 3 + GAME_CONFIG.ITEM_TYPES.length + idleFrameSources.length; 
    let assetsLoaded = 0;
    
    // ✨ 新增：載入進度 UI 元素
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingText = document.getElementById('loading-text');

    // ✨ 修改：更新載入進度顯示
    function updateLoadingProgress() {
        const progress = Math.floor((assetsLoaded / assetsToLoad) * 100);
        loadingProgressBar.style.width = progress + '%';
        loadingText.textContent = `${progress}%`;
    }

    // ✨ 修改：資源載入完成回調
    function onAssetLoad() {
        assetsLoaded++;
        updateLoadingProgress(); // ✨ 更新進度條
        
        if (assetsLoaded === assetsToLoad) {
            console.log("所有圖片資源載入完成！");
            player.image = player.defaultImage;
            player.loaded = true;
            
            // ✨ 隱藏載入畫面（加入淡出動畫）
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, GAME_CONFIG.UI.LOADING_FADE_DURATION); // 等待淡出動畫完成
            }, GAME_CONFIG.UI.LOADING_FADE_DELAY); // 延遲 0.5 秒後開始淡出
        }
    }

    // ✨ 新增：資源載入錯誤處理
    function onAssetError(error) {
        console.error('資源載入失敗:', error);
        assetsLoaded++; // 即使失敗也計入，避免卡住
        updateLoadingProgress();
        
        if (assetsLoaded === assetsToLoad) {
            // 即使有錯誤，也繼續遊戲
            player.image = player.defaultImage;
            player.loaded = true;
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, GAME_CONFIG.UI.LOADING_FADE_DURATION);
            }, GAME_CONFIG.UI.LOADING_FADE_DELAY);
        }
    }

    // ✨ 步驟 3：載入所有圖片 (加入錯誤處理)
    // 玩家預設/勝利/失敗圖
    player.defaultImage.src = idleFrameSources[0];
    player.defaultImage.onload = onAssetLoad;
    player.defaultImage.onerror = () => onAssetError('defaultImage');

    player.winImage.src = './images/xiao-yuan-bao-win.png';
    player.winImage.onload = onAssetLoad;
    player.winImage.onerror = () => onAssetError('winImage');

    player.loseImage.src = './images/xiao-yuan-bao-lose.png';
    player.loseImage.onload = onAssetLoad;
    player.loseImage.onerror = () => onAssetError('loseImage');

    // 掉落物圖
    GAME_CONFIG.ITEM_TYPES.forEach(type => {
        const img = new Image();
        img.src = type.src;
        img.onload = onAssetLoad;
        img.onerror = () => onAssetError(type.id);
        itemImages[type.id] = img;
    });

    // ✨ 步驟 4：載入所有待機動畫幀 (加入錯誤處理)
    idleFrameSources.forEach((src, index) => {
        const img = new Image();
        img.src = src;
        img.onload = onAssetLoad;
        img.onerror = () => onAssetError(`idleFrame-${index}`);
        player.idleFrames.push(img);
    });

    // --- 事件監聽 (不變) ---
    document.addEventListener('keydown', (e) => { if (!gameStarted) return; if (e.key === 'ArrowLeft') keys.left = true; if (e.key === 'ArrowRight') keys.right = true; });
    document.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') keys.left = false; if (e.key === 'ArrowRight') keys.right = false; });
    const handleTouchStart = (e) => { e.preventDefault(); if (!gameStarted) return; };
    moveLeftButton.addEventListener('touchstart', (e) => { handleTouchStart(e); keys.left = true; });
    moveRightButton.addEventListener('touchstart', (e) => { handleTouchStart(e); keys.right = true; });
    moveLeftButton.addEventListener('touchend', () => { keys.left = false; });
    moveRightButton.addEventListener('touchend', () => { keys.right = false; });
    moveLeftButton.addEventListener('mousedown', () => { keys.left = true; });
    moveRightButton.addEventListener('mousedown', () => { keys.right = true; });
    document.addEventListener('mouseup', () => { keys.left = false; keys.right = false; });

    // --- 生成/碰撞/音效/i18n 函式 ---
    function spawnItem() {
        const totalProbability = GAME_CONFIG.ITEM_TYPES.reduce((sum, item) => sum + item.probability, 0);
        let random = Math.random() * totalProbability;
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

        fallingItems.push({
            x: Math.random() * (canvas.width - GAME_CONFIG.ITEM_DEFAULT_SIZE),
            y: GAME_CONFIG.ITEM_SPAWN_Y_OFFSET,
            width: GAME_CONFIG.ITEM_DEFAULT_SIZE,
            height: GAME_CONFIG.ITEM_DEFAULT_SIZE,
            speed: chosenItemType.speed,
            score: chosenItemType.score,
            type: chosenItemType.type,
            image: itemImages[chosenItemType.id]
        });
    }
    function checkCollision(obj1, obj2) { /* ... (不變) ... */ return obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x && obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y; }
    function playSound(audioObject, isSFX = true) { if (isMuted) return; if (!audioObject) return; if (isSFX) { audioObject.currentTime = 0; } audioObject.play().catch(error => { console.warn(`音效播放失敗: ${error.message}`); }); }
    
    function showScoreChange(score) {
        const scoreChangeElement = document.getElementById('score-change');
        if (!scoreChangeElement) return;

        const scoreValue = parseInt(score, 10);
        if (isNaN(scoreValue) || scoreValue === 0) return;

        scoreChangeElement.textContent = (scoreValue > 0 ? '+' : '') + scoreValue;
        scoreChangeElement.classList.remove('positive', 'negative', 'show');

        if (scoreValue > 0) {
            scoreChangeElement.classList.add('positive');
        } else {
            scoreChangeElement.classList.add('negative');
        }

        // Force reflow to restart animation
        void scoreChangeElement.offsetWidth;

        scoreChangeElement.classList.add('show');

        setTimeout(() => {
            scoreChangeElement.classList.remove('show');
        }, GAME_CONFIG.UI.SCORE_CHANGE_DURATION); // Duration should match CSS transition
    }
    
    // --- i18n 語言相關函式 (✨ 更新) ---
    function applyLanguage(lang) {
        if (!i18nStrings[lang]) { console.warn(`找不到語言 ${lang}，使用 zh-TW。`); lang = 'zh-TW'; }
        currentLang = lang;
        langSelect.value = lang; 

        // 1. 更新 textContent
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.dataset.i18nKey;
            if (i18nStrings[lang][key]) {
                element.textContent = i18nStrings[lang][key];
            }
        });
        
        // 2. 更新 placeholder
        document.querySelectorAll('[data-i18n-key-placeholder]').forEach(element => {
            const key = element.dataset.i18nKeyPlaceholder;
            if (i18nStrings[lang][key]) {
                element.placeholder = i18nStrings[lang][key];
            }
        });
        document.title = i18nStrings[lang].modalStartTitle;
        showStartModalText(); // 更新開始畫面文字

    }    
    function detectLanguage() { let browserLang = navigator.language || navigator.userLanguage; if (browserLang.startsWith('en')) { applyLanguage('en'); } else if (browserLang.startsWith('zh')) { applyLanguage('zh-TW'); } else { applyLanguage('zh-TW'); } }
    function shuffleArray(array) { /* ... (不變) ... */ for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }

    // ========================================================================
    // --- ✨ 彈窗狀態管理 (v10) ✨ ---
    // ========================================================================

    // 顯示開始畫面
    function showStartModalText() {
        modalTitle.textContent = i18nStrings[currentLang].modalStartTitle;
        modalText.textContent = i18nStrings[currentLang].modalStartText;
        startButton.textContent = i18nStrings[currentLang].modalStartButton;

        // ✨ 顯示/隱藏正確的 UI
        startScreenUI.classList.remove('hidden');
        endgameScreenUI.classList.add('hidden'); // 隱藏結算
        questionArea.classList.add('hidden');
        importUiArea.classList.add('hidden');
        openImportButton.classList.remove('hidden');
        
        modal.classList.remove('hidden');
    } 
    
    // 顯示匯入畫面
    function showImportUI() {
        startScreenUI.classList.add('hidden');
        endgameScreenUI.classList.add('hidden');
        questionArea.classList.add('hidden');
        openImportButton.classList.add('hidden'); // 隱藏匯入按鈕
        
        importUiArea.classList.remove('hidden');
    }

    // ✨ 修改：顯示個人里程碑彈窗 (加入流程控制)
    async function showMilestoneModal(isEndGameFlow = false) {
        
        await loadPlayerProfile(); 
        
        const currentScore = playerProfile.cumulativeScore;
        const maxScore = GAME_CONFIG.MILESTONES.PERSONAL.TIER_3_SCORE; // Tier 3 門檻
        const progressPercent = Math.min(100, (currentScore / maxScore) * 100);
        milestoneProgressBarFill.style.width = progressPercent + '%';
        milestoneCurrentScore.textContent = currentScore;
        
        const milestoneQualifiedText = i18nStrings[currentLang].milestoneQualified;
        
        // Tier 1 (10,000) - 數位小卡 (可重複領)
        if (currentScore >= GAME_CONFIG.MILESTONES.PERSONAL.TIER_1_SCORE) {
            claimTier1Button.classList.remove('hidden');
            claimTier1Button.classList.remove('claimed');
            claimTier1Button.textContent = i18nStrings[currentLang].milestoneDownload;
        } else {
            claimTier1Button.classList.add('hidden');
        }

        // Tier 2 (25,000) - 抽獎券 (領一次)
        if (currentScore >= GAME_CONFIG.MILESTONES.PERSONAL.TIER_2_SCORE) {
            claimTier2Button.classList.remove('hidden');
            if (playerProfile.tier2Qualified) {
                claimTier2Button.classList.add('claimed'); 
                claimTier2Button.textContent = milestoneQualifiedText;
            } else {
                claimTier2Button.classList.remove('claimed');
                claimTier2Button.textContent = i18nStrings[currentLang].milestoneClaimButton;
            }
        } else {
            claimTier2Button.classList.add('hidden');
        }

        // Tier 3 (50,000) - 抽獎券 (領一次)
        if (currentScore >= GAME_CONFIG.MILESTONES.PERSONAL.TIER_3_SCORE) {
            claimTier3Button.classList.remove('hidden');
            if (playerProfile.tier3Qualified) {
                claimTier3Button.classList.add('claimed');
                claimTier3Button.textContent = milestoneQualifiedText;
            } else {
                claimTier3Button.classList.remove('claimed');
                claimTier3Button.textContent = i18nStrings[currentLang].milestoneClaimButton;
            }
        } else {
            claimTier3Button.classList.add('hidden');
        }

        // ✨ 流程控制：根據是否在結算流程中，切換按鈕
        if (isEndGameFlow) {
            milestoneCloseButton.textContent = i18nStrings[currentLang].continueButton;
            milestoneCloseButton.onclick = showGlobalMilestoneStep; // 點擊「繼續」-> 顯示全體
        } else {
            milestoneCloseButton.textContent = i18nStrings[currentLang].milestoneConfirmButton;
            milestoneCloseButton.onclick = () => { milestoneModal.classList.add('hidden'); }; // 點擊「確認」-> 關閉
        }
        
        milestoneModal.classList.remove('hidden');
    }

    // ✨ 新增：結算流程 Step 2 (顯示個人里程碑)
    function showPersonalMilestoneStep() {
        modal.classList.add('hidden'); // 關閉 Step 1
        showMilestoneModal(true); // 開啟個人里程碑 (並傳入 true)
    }

    // ✨ 新增：顯示全體里程碑彈窗
    async function showGlobalMilestoneModal(isEndGameFlow = false) {
        
        // 1. 讀取最新全體分數
        // (我們修改 loadTotalMilestoneScore 讓它能回傳%數)
        const progressPercent = await loadTotalMilestoneScore(true); 
        
        // 2. 更新 UI
        globalMilestoneProgressBarFill.style.width = progressPercent;
        globalMilestoneCurrentPercent.textContent = progressPercent;

        // 3. 流程控制：切換按鈕
        if (isEndGameFlow) {
            // 在結算流程中 (Step 3)
            globalMilestoneCloseButton.classList.add('hidden');
            globalMilestoneRestartButton.classList.remove('hidden');
            globalMilestoneShareButton.classList.remove('hidden');
            
            // 綁定按鈕
            globalMilestoneRestartButton.onclick = closeSettlementAndCheckBirthday; // 點擊「重新開始」
            globalMilestoneShareButton.onclick = copyShareText; // 點擊「分享」

        } else {
            // 獨立查看時
            globalMilestoneCloseButton.classList.remove('hidden');
            globalMilestoneRestartButton.classList.add('hidden');
            globalMilestoneShareButton.classList.add('hidden');
            
            // 綁定按鈕
            globalMilestoneCloseButton.onclick = () => { globalMilestoneModal.classList.add('hidden'); }; // 點擊「關閉」
        }

        // 4. 顯示彈窗
        globalMilestoneModal.classList.remove('hidden');
    }

    // ✨ 新增：結算流程 Step 3 (顯示全體里程碑)
    function showGlobalMilestoneStep() {
        milestoneModal.classList.add('hidden'); // 關閉 Step 2
        showGlobalMilestoneModal(true); // 開啟全體里程碑 (並傳入 true)
    }

    // --- 遊戲狀態函式 (✨ 更新) ---
    function showQuestion() {
        gameStarted = false;
        clearGameTimers(); // ✨ 使用統一清理函式
        audio.bgm.pause();
        audio.bgmFever.pause();

        if (typeof QUESTION_BANK === 'undefined' || QUESTION_BANK.length === 0) { console.error("錯誤：題庫 (QUESTION_BANK) 未定義或為空！"); resumeGame(); return; }
        const qIndex = Math.floor(Math.random() * QUESTION_BANK.length);
        const selectedQuestion = QUESTION_BANK[qIndex];  
        const qData = selectedQuestion[currentLang];
        if (!qData) {
            console.error(`找不到題目 ${selectedQuestion.id} 的 ${currentLang} 語言資料`);
            resumeGame();
            return;
        }
        let options = [...qData.incorrectAnswers, qData.correctAnswer];
        shuffleArray(options);

        // 隱藏其他 UI，顯示問答 UI
        startScreenUI.classList.add('hidden');
        endgameScreenUI.classList.add('hidden');
        importUiArea.classList.add('hidden');
        openImportButton.classList.add('hidden');
        
        questionArea.classList.remove('hidden');
        
        // 填入問答文字
        questionText.textContent = qData.question;
        answerButtons.forEach((button, index) => {
            button.textContent = options[index];
            button.dataset.correct = (options[index] === qData.correctAnswer) ? "true" : "false";
        });
        modal.classList.remove('hidden');
    }

    function handleAnswer(event) {
        const clickedButton = event.target;
        const isCorrect = clickedButton.dataset.correct === "true";
        answerButtons.forEach(btn => btn.disabled = true);
        if (isCorrect) {
            let bonusPoints = GAME_CONFIG.SCORING.CORRECT_ANSWER;
            if (isFeverTime) bonusPoints *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
            score += bonusPoints;
            player.image = player.winImage; playSound(audio.answerCorrect);
            stats_questions_correct++;
        } else {
            score += GAME_CONFIG.SCORING.INCORRECT_ANSWER;
            player.image = player.loseImage; playSound(audio.answerIncorrect);
            stats_questions_wrong++;
        }
        scoreDisplay.textContent = score;
        player.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION;
        let correctButton = null;
        answerButtons.forEach(btn => { if (btn.dataset.correct === "true") { correctButton = btn; } });
        if (isCorrect) { clickedButton.classList.add('correct-answer');
        } else { clickedButton.classList.add('incorrect-answer'); if (correctButton) { correctButton.classList.add('correct-answer'); } }
        setTimeout(resumeGame, GAME_CONFIG.UI.POST_ANSWER_DELAY);
    }

    function resumeGame() {
        answerButtons.forEach(btn => { btn.disabled = false; btn.classList.remove('correct-answer', 'incorrect-answer'); });
        modal.classList.add('hidden');
        gameStarted = true;
        clearGameTimers(); // ✨ 先清理舊的計時器（如果存在）
        gameTimerId = setInterval(updateTimer, 1000);
        if (isMuted) return;
        if (isFeverTime) { playSound(audio.bgmFever, false); } 
        else { playSound(audio.bgm, false); }
    }

    function updateTimer() {
        // ... (此函式不變) ...
        timeLeft--; timeDisplay.textContent = `${timeLeft}s`;
        if (timeLeft <= 0) { endGame(); }
    }
    
    function activateFeverTime() {
        if (isFeverTime) return;
        isFeverTime = true;
        feverDurationTimer = GAME_CONFIG.FEVER.DURATION;
        spawnInterval = Math.floor(baseSpawnInterval * GAME_CONFIG.FEVER.SPAWN_INTERVAL_MULTIPLIER);
        
        // 確保主BGM停止，並且時間歸零
        audio.bgm.pause();
        audio.bgm.currentTime = 0; 

        // ✨ 修正：確保 Fever BGM 也是循環播放的
        audio.bgmFever.loop = true; 
        playSound(audio.bgmFever, false); // 第二個參數 false 表示不重設播放時間（即循環播放）
        
        console.log("FEVER TIME ACTIVATED!");
    }    
    
    function endFeverTime() {
        if (!isFeverTime) return;
        isFeverTime = false;
        feverMeter = 0;
        feverDurationTimer = 0;
        spawnInterval = baseSpawnInterval;
        
        // 確保 Fever BGM 停止，並且時間歸零
        audio.bgmFever.pause();
        audio.bgmFever.currentTime = 0;

        playSound(audio.bgm, false); // 播放主 BGM
        
        console.log("FEVER TIME ENDED.");
    }    

    // ✨ 修正重構：endGame() (結算流程 Step 1)
    function endGame() {
        gameStarted = false;
        clearGameTimers(); // ✨ 使用統一清理函式
        audio.bgm.pause(); audio.bgm.currentTime = 0;
        audio.bgmFever.pause(); audio.bgmFever.currentTime = 0;
        playSound(audio.gameOver);
        
        // 1. 填入結算畫面的文字和統計數據
        endgameTitle.textContent = i18nStrings[currentLang].modalEndTitle;
        endgameScoreText.textContent = i18nStrings[currentLang].modalEndText.replace('{score}', score);
        // (假設 stats_items_positive 等變數是正確的)
        statsPositive.textContent = stats_items_positive; 
        statsNegative.textContent = stats_items_negative;
        statsCorrect.textContent = stats_questions_correct;
        statsWrong.textContent = stats_questions_wrong;
        
        // ✨ 新增步驟：儲存本局統計數據到 currentStats (已遺失的關鍵步驟)
        // 確保 stats_positive, stats_negative, stats_correct, stats_wrong, totalGameTime, stats_feverCount, stats_feverTime 都是可用的全域變數
        currentStats = {
            statsPositive: stats_items_positive, 
            statsNegative: stats_items_negative,
            statsCorrect: stats_questions_correct, 
            statsWrong: stats_questions_wrong,
            statsTime: totalGameTime, 
            statsFeverCount: stats_feverCount, 
            statsFeverTime: stats_feverTime, 
        };

        // 2. 顯示/隱藏正確的彈窗元素
        startScreenUI.classList.add('hidden'); // 隱藏開始畫面
        questionArea.classList.add('hidden');
        importUiArea.classList.add('hidden');
        openImportButton.classList.add('hidden');
        
        endgameScreenUI.classList.remove('hidden'); // ✨ 顯示結算 Step 1
        
        modal.classList.remove('hidden'); // 顯示主彈窗

        // 3. 上傳分數
        if (score > 0) { 
            // 現在 uploadScore(score) 執行時，currentStats 已經有資料了
            uploadScore(score); 
        }
        
        // 4. 綁定「繼續」按鈕，進入 Step 2
        endgameContinueButton.onclick = showPersonalMilestoneStep;
    }

    // ✨ 關閉結算彈窗並檢查生日 (v11 修正版)
    function closeSettlementAndCheckBirthday() {
        
        // ✨ 修正：隱藏所有遊戲主彈窗
        modal.classList.add('hidden'); // 關閉主彈窗 (Step 1)
        milestoneModal.classList.add('hidden'); // 關閉個人里程碑 (Step 2)
        globalMilestoneModal.classList.add('hidden'); // 關閉全體里程碑 (Step 3)

        // 檢查日期
        // const isBirthday = true; // 測試用
        if (isBirthdayToday()) {
            // ✨ 是生日：顯示彩蛋彈窗
            birthdayMessage.innerHTML = i18nStrings[currentLang].birthdayMessage.replace(/\n/g, '<br>');
            birthdayModal.classList.remove('hidden');
            playSound(audio.birthday, false);
        } else {
            // 不是生日：直接重啟
            restartGame();
        }
    }

    // ✨ 修正：分享文案複製成功後，不再強制關閉彈窗
    function copyShareText() {
        
        // 🚨 注意：您可能還需要為 lang.js 補上 'shareSuccess' 和 'shareFailure' 字串
        const shareSuccessText = i18nStrings[currentLang].shareSuccess || '分享文案已複製到剪貼簿！';
        const shareFailureText = i18nStrings[currentLang].shareFailure || '複製失敗，請手動複製！';
        
        // 1. 取得當前需要的數據
        const currentScore = score; 
        const cumulativeScore = playerProfile.cumulativeScore; 
        const globalProgress = globalMilestoneCurrentPercent.textContent; 

        // 2. 套用模板並替換變數
        let shareText = i18nStrings[currentLang].shareTextTemplate;
        shareText = shareText.replace('{score}', currentScore);
        shareText = shareText.replace('{cumulativeScore}', cumulativeScore);
        shareText = shareText.replace('{globalProgress}', globalProgress);

        // 3. 執行複製
        navigator.clipboard.writeText(shareText)
            .then(() => {
                // ✨ 修正：複製成功後只提示，不再執行關閉彈窗的動作
                alert(shareSuccessText); 
                // 這裡移除 globalMilestoneModal.classList.add('hidden');
            })
            .catch(err => {
                console.error('複製失敗: ', err);
                alert(shareFailureText + '\n' + shareText);
            });
    }

    // ✨ 提醒：關於截圖
    // 截圖功能需要引入外部函式庫 (如 html2canvas)，
    // 它會讀取 DOM 並繪製到 Canvas 上，這比較複雜。
    // 我們目前先實作「複製文字」，這是最核心的分享功能。

    function resetGame() {
        score = 0;
        timeLeft = GAME_CONFIG.GAME_TIME;
        isFeverTime = false;
        feverMeter = 0;
        feverDurationTimer = 0;
        fallingItems = [];
        player.x = canvas.width / 2 - GAME_CONFIG.PLAYER.WIDTH / 2;
        spawnInterval = baseSpawnInterval;
        spawnTimer = spawnInterval;
        
        // ✨ 重置統計數據
        stats_items_positive = 0;
        stats_items_negative = 0;
        stats_questions_correct = 0;
        stats_questions_wrong = 0;

        scoreDisplay.textContent = `0`;
        timeDisplay.textContent = `${timeLeft}s`;
        milestoneProgress.textContent = `0%`;
        
        if (player.loaded) player.image = player.defaultImage;

        // ✨ 新增：重置動畫幀狀態
        player.currentFrame = 0;
        player.frameCounter = 0;
    }
    
    function startGame() {
        gameStarted = true;
        clearGameTimers(); // ✨ 先清理舊的計時器（如果存在）
        resetGame();
        modal.classList.add('hidden'); // 隱藏所有彈窗
        gameTimerId = setInterval(updateTimer, 1000);
        playSound(audio.gameStart);
        playSound(audio.bgm, false);
        // 遊戲開始時，重設統計變數
        stats_positive = 0;
        stats_negative = 0;
        stats_correct = 0;
        stats_wrong = 0;
        stats_feverCount = 0;
        stats_feverTime = 0;
    }
    
    function restartGame() {
        birthdayModal.classList.add('hidden');
        audio.birthday.pause();
        audio.birthday.currentTime = 0;
        showStartModalText(); // 顯示開始畫面
    }

    // ✨ 升級：同時上傳本局分數，並累加玩家總分 (使用 Batch)
    async function uploadScore(score) {
        if (!currentUserID || !db) {
            console.log("尚未取得 UserID 或 DB，無法上傳分數。");
            return;
        }

        // 1. 建立一個批量寫入操作
        const batch = db.batch();

        // --- A. scores 集合：寫入本局分數 (供全體里程碑計算) ---
        const scoreRef = db.collection('scores').doc(); // 建立一個新的文件 ID
        const scoreData = {
            userId: currentUserID,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            version: GAME_CONFIG.VERSION,
            isBirthday: isBirthdayToday(), // ✨ 加回：是否為生日當天
            stats: currentStats,     // ✨ 加回：本局遊戲詳細統計
        };
        batch.set(scoreRef, scoreData);

        // --- B. players 集合：累加個人總分 (供個人里程碑計算) ---
        const playerRef = db.collection('players').doc(currentUserID);
        const playerData = {
            // 如果文件不存在，這個操作會自動建立文件，並設定初始值
            cumulativeScore: firebase.firestore.FieldValue.increment(score),
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
            claimedTier1: false, 
            tier2Qualified: false, 
            tier3Qualified: false
        };
        
        batch.set(playerRef, playerData, { merge: true });

        // 2. 提交批量操作
        try {
            await batch.commit();
            console.log("分數上傳與個人總分累加成功 (Batch Commit)！");
            
            // ✨ (新) 寫入成功後，立刻更新本地的 playerProfile
            // 注意：這裡我們「假設」寫入成功，直接在本地累加，避免再次讀取
            playerProfile.cumulativeScore += score;
            
        } catch (error) {
            console.error("分數上傳或個人總分累加失敗:", error);
            // 建議：可以在這裡提示用戶上傳失敗，或嘗試再次上傳
        }
    }

    // ✨ 修改：讓函式回傳%數 (用於 Global 彈窗)
    async function loadTotalMilestoneScore(isEndGame = false) {
        if (!db) return '0%';
        let totalScore = 0;
        let progressPercent = '0%';
        
        try {
            const querySnapshot = await db.collection("scores").get();
            querySnapshot.forEach((doc) => {
                totalScore += doc.data().score;
            });
            
            console.log("目前里程碑總分: ", totalScore);
            const milestoneTarget = GAME_CONFIG.MILESTONES.GLOBAL_TARGET;
            progressPercent = Math.min(100, (totalScore / milestoneTarget) * 100).toFixed(1) + '%';
            
            // 更新頂部 info-bar (不變)
            milestoneProgress.textContent = progressPercent;
            
            // (移除舊的 isEndGame 邏輯，因為結算畫面改了)
            
        } catch (error) {
            console.error("讀取總分失敗: ", error);
        }
        
        return progressPercent; // ✨ 回傳%數字串
    }

    // ✨ 新增：讀取玩家個人里程碑資料
    async function loadPlayerProfile() {
        if (!currentUserID || !db) {
            console.log("尚未取得 UserID 或 DB，無法讀取個人資料。");
            return; // 安全防護
        }

        // 1. 設定要讀取的文件路徑
        // 集合 (Collection) 叫 'players'，文件 (Document) ID 就是玩家的 ID
        const playerRef = db.collection('players').doc(currentUserID);

        try {
            // 2. 嘗試從 Firebase 取得該文件
            const doc = await playerRef.get();

            if (doc.exists) {
                // 3. 如果文件存在 (老玩家)
                console.log("成功讀取玩家資料:", doc.data());
                // 將 Firebase 上的資料與本地預設值合併，存入全域變數
                playerProfile = {
                    ...{ cumulativeScore: 0, claimedTier1: false, tier2Qualified: false, tier3Qualified: false }, // 預設值
                    ...doc.data() // 來自 Firebase 的資料
                };
            } else {
                // 4. 如果文件不存在 (新玩家)
                console.log("找不到玩家資料，將在遊戲結束後自動建立。");
                // (保持 playerProfile 為預設值即可)
            }
        } catch (error) {
            console.error("讀取玩家資料失敗:", error);
            // 即使讀取失敗，遊戲仍可使用本地的預設值繼續
        }
    }
    // ✨ 新增：領取獎勵函式
    async function claimReward(tier) {
        if (!currentUserID || !db) {
            alert("資料庫連線錯誤，請稍後再試。");
            return;
        }

        const playerRef = db.collection('players').doc(currentUserID);
        let successMessage = "";
        let tierField = ''; // 要更新的 Firebase 欄位

        switch (tier) {
            case 1:
                // Tier 1: 數位小卡 (不需更新 Firebase，允許重複點擊下載)
                successMessage = `恭喜您達成 Tier 1！請點擊以下連結下載您的【${i18nStrings[currentLang].milestoneTier1}】：\n\n${GAME_CONFIG.MILESTONES.REWARDS.TIER_1_URL}`;
                
                // 開啟連結在新分頁
                window.open(GAME_CONFIG.MILESTONES.REWARDS.TIER_1_URL, '_blank');
                break;

            case 2:
                // Tier 2: 實體抽獎資格 (檢查並更新 Firebase)
                if (playerProfile.cumulativeScore < GAME_CONFIG.MILESTONES.PERSONAL.TIER_2_SCORE) return; // 安全檢查
                if (playerProfile.tier2Qualified) {
                    successMessage = GAME_CONFIG.MILESTONES.REWARDS.TIER_2_MESSAGE; // 已領過
                } else {
                    tierField = 'tier2Qualified';
                    successMessage = GAME_CONFIG.MILESTONES.REWARDS.TIER_2_MESSAGE; // 剛領取
                }
                break;

            case 3:
                // Tier 3: 月曆卡抽獎資格 (檢查並更新 Firebase)
                if (playerProfile.cumulativeScore < GAME_CONFIG.MILESTONES.PERSONAL.TIER_3_SCORE) return; // 安全檢查
                if (playerProfile.tier3Qualified) {
                    successMessage = GAME_CONFIG.MILESTONES.REWARDS.TIER_3_MESSAGE; // 已領過
                } else {
                    tierField = 'tier3Qualified';
                    successMessage = GAME_CONFIG.MILESTONES.REWARDS.TIER_3_MESSAGE; // 剛領取
                }
                break;
            default:
                return;
        }

        // 處理 Tier 2 和 Tier 3 的 Firebase 狀態更新
        if (tierField && !playerProfile[tierField]) {
            try {
                // 將對應欄位設為 true (已獲得資格)
                await playerRef.update({ [tierField]: true });
                playerProfile[tierField] = true; // 更新本地狀態
                
                // 重新渲染彈窗，讓按鈕變灰/文字改變
                showMilestoneModal(); 
            } catch (error) {
                console.error(`更新 Tier ${tier} 資格失敗:`, error);
                alert(`更新 Tier ${tier} 資格失敗，請檢查網路連線。`);
                return;
            }
        }
        
        // 顯示結果通知
        alert(successMessage);
    }

    // ✨ 新增：統一的計時器清理函式
    function clearGameTimers() {
        if (gameTimerId !== null) {
            clearInterval(gameTimerId);
            gameTimerId = null;
        }
    }

    // --- 核心 Update 函式 (✨ 修正動畫切換邏輯) ---
    function update() {
        if (!gameStarted) return; 
        if (keys.left && player.x > 0) player.x -= player.speed;
        if (keys.right && player.x < canvas.width - player.width) player.x += player.speed;
        spawnTimer--;
        if (spawnTimer <= 0) { spawnItem(); spawnTimer = spawnInterval; }
        if (isFeverTime) { feverDurationTimer--; if (feverDurationTimer <= 0) { endFeverTime(); } }
        milestoneProgress.textContent = `${feverMeter}%`; 
        
        for (let i = fallingItems.length - 1; i >= 0; i--) {
            const item = fallingItems[i];
            item.y += item.speed;
            if (checkCollision(player, item)) {
                let pointsToChange = 0;
                let feverBoost = 0;
                
                if (item.type === 'positive') {
                    pointsToChange = item.score; 
                    feverBoost = GAME_CONFIG.FEVER.POSITIVE_ITEM_BOOST; 
                    if (isFeverTime) pointsToChange *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
                    player.image = player.winImage; // ✨ 設定為 Win 圖片
                    playSound(audio.collectPositive);
                    stats_items_positive++;
                } else if (item.type === 'special') {
                    pointsToChange = item.score; 
                    feverBoost = GAME_CONFIG.FEVER.SPECIAL_ITEM_BOOST; 
                    if (isFeverTime) pointsToChange *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
                    player.image = player.winImage; // ✨ 設定為 Win 圖片
                    playSound(audio.collectSpecial);
                    stats_items_positive++;
                } else if (item.type === 'negative') {
                    pointsToChange = -item.score;
                    player.image = player.loseImage; // ✨ 設定為 Lose 圖片
                    playSound(audio.collectNegative);
                    stats_items_negative++;
                } else if (item.type === 'question') {
                    playSound(audio.collectQuestion); showQuestion();
                }
                
                feverMeter = Math.min(GAME_CONFIG.FEVER.MAX_METER, feverMeter + feverBoost);
                if (feverMeter >= GAME_CONFIG.FEVER.MAX_METER && !isFeverTime) { activateFeverTime(); }
                
                if(item.type !== 'question') {
                     score += pointsToChange;
                     showScoreChange(pointsToChange);
                     scoreDisplay.textContent = score; 
                     player.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION; // ✨ 啟動 Win/Lose 動畫計時器
                 }
                fallingItems.splice(i, 1);
            }
            else if (item.y > canvas.height) { fallingItems.splice(i, 1); }
        }

        // --- ✨ 修正：動畫狀態切換邏輯 ---
        if (player.animationTimer > 0) {
            // 1. 如果在 Win/Lose 冷卻中，倒數
            player.animationTimer--;
        } else {
            // 2. 如果不在冷卻中，播放待機 (Idle) 動畫
            player.frameCounter++;
            if (player.frameCounter >= player.frameRate) {
                player.currentFrame = (player.currentFrame + 1) % player.idleFrames.length;
                player.frameCounter = 0;
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 

        let imageToDraw; // 準備要畫的玩家圖片

        // --- ✨ 修正：判斷要畫哪一張玩家圖片 ---
        if (player.animationTimer > 0) {
            // 狀態 1：正在 Win/Lose 動畫冷卻中
            imageToDraw = player.image; // (此時 player.image 是 winImage 或 loseImage)
        } else {
            // 狀態 2：在待機 (Idle) 狀態
            if (player.idleFrames.length > 0) {
                imageToDraw = player.idleFrames[player.currentFrame]; // 畫出當前動畫幀
            } else {
                imageToDraw = player.defaultImage; // 如果動畫幀載入失敗，退回畫預設圖
            }
        }

        // --- 繪製玩家 ---
        if (imageToDraw && imageToDraw.complete) {
            ctx.drawImage(imageToDraw, player.x, player.y, player.width, player.height);
        } else if (player.defaultImage.complete) {
            // 備用繪製
            ctx.drawImage(player.defaultImage, player.x, player.y, player.width, player.height);
        } else {
            // 最終備用 (紅色方塊)
            ctx.fillStyle = '#f72585';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        // --- ✨ 關鍵：重新加回繪製掉落物的迴圈 ---
        fallingItems.forEach(item => {
            if (item.image && item.image.complete) {
                ctx.drawImage(item.image, item.x, item.y, item.width, item.height);
            }
        });
    }

    function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
    
    // ========================================================================
    // --- 遊戲啟動邏輯 (✨ 更新: 綁定新按鈕) ---
    // ========================================================================
    gameLoop();
    loadTotalMilestoneScore(); // (舊有)
    loadPlayerProfile(); // ✨ 新增：遊戲載入時，讀取一次個人資料
    
    // --- 綁定主要按鈕 ---
    startButton.onclick = startGame;
    answerButtons.forEach(button => { button.addEventListener('click', handleAnswer); });
    muteButton.addEventListener('click', () => { isMuted = !isMuted; muteButton.textContent = isMuted ? '🔇' : '🔊'; muteButton.classList.toggle('muted', isMuted); if (isMuted) { audio.bgm.pause(); audio.bgmFever.pause(); } else if (gameStarted && !isFeverTime) { playSound(audio.bgm, false); } });
    langSelect.addEventListener('change', (event) => { applyLanguage(event.target.value); });
    birthdayCloseButton.addEventListener('click', restartGame);

    // --- 綁定 ID 轉移按鈕 ---
    copyIdButton.addEventListener('click', () => {
        if (!navigator.clipboard) { alert("瀏覽器不支援，請手動選取複製您的完整 ID:\n" + currentUserID); return; }
        navigator.clipboard.writeText(currentUserID).then(() => {
            // ✨ 修正：使用 data-i18n-key 來更新文字
            const originalText = copyIdButton.innerHTML; // 因為裡面是 <img>，所以不用 textContent
            copyIdButton.textContent = i18nStrings[currentLang].copiedButton; // 暫時用文字替換
            setTimeout(() => {
                copyIdButton.innerHTML = originalText; // 換回 icon
                applyLanguage(currentLang); // 確保 i18n 文字正確
            }, GAME_CONFIG.UI.COPY_SUCCESS_DELAY);
        }).catch(err => { console.error('複製失敗: ', err); alert("複製失敗:\n" + currentUserID); });
    });
    
    openImportButton.addEventListener('click', showImportUI);
    importCancelButton.addEventListener('click', showStartModalText); // 點擊取消，回到開始畫面

    importButton.addEventListener('click', () => {
        const importID = importInput.value.trim();
        if (importID.length > GAME_CONFIG.VALIDATION.IMPORT_ID_MIN_LENGTH && importID.includes('-')) { 
            if (confirm(i18nStrings[currentLang].importConfirm)) {
                localStorage.setItem(GAME_CONFIG.USER_ID_KEY, importID);
                alert(i18nStrings[currentLang].importSuccess);
                window.location.reload();
            }
        } else {
            alert(i18nStrings[currentLang].importError);
        }
    });

    // ✨ 新增：綁定個人里程碑按鈕
    openMilestoneButton.addEventListener('click', () => showMilestoneModal(false)); // 傳入 false
    milestoneCloseButton.addEventListener('click', () => {
        milestoneModal.classList.add('hidden');
    });
    
    // ✨ 新增：綁定全體里程碑按鈕
    openGlobalMilestoneButton.addEventListener('click', () => showGlobalMilestoneModal(false)); // 傳入 false

    // ✨ 領取獎勵的按鈕綁定不變
    claimTier1Button.addEventListener('click', (e) => {
        // Tier 1 允許重複領取/下載
        claimReward(1);
    });
    
    claimTier2Button.addEventListener('click', (e) => {
        // 如果按鈕顯示「已獲得資格」，點擊時給予提示 (非領取動作)
        if (e.target.classList.contains('claimed')) {
            alert(GAME_CONFIG.MILESTONES.REWARDS.TIER_2_MESSAGE);
            return;
        }
        claimReward(2);
    });
    
    claimTier3Button.addEventListener('click', (e) => {
        // 如果按鈕顯示「已獲得資格」，點擊時給予提示 (非領取動作)
        if (e.target.classList.contains('claimed')) {
            alert(GAME_CONFIG.MILESTONES.REWARDS.TIER_3_MESSAGE);
            return;
        }
        claimReward(3);
    });

    // --- 啟動 ---
    detectLanguage();
    importInput.placeholder = i18nStrings[currentLang].importPlaceholder;
    showStartModalText(); // 顯示開始畫面
});