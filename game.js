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

    // --- 初始化 HTML 元素 (✨ 更新) ---
    const db = firebase.firestore();
    const auth = firebase.auth(); // ✨ 1. 新增：取得 Firebase Auth 服務
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // 全域 UI
    const langSelect = document.getElementById('lang-select');
    // ✨ 暫時隱藏：進度 ID 相關元素（未來可能添加匯入進度 ID 功能）
    // const userIdDisplay = document.getElementById('user-id-display');
    // const copyIdButton = document.getElementById('copy-id-button');
    const userIdDisplay = null; // 暫時設為 null，避免後續代碼報錯
    const copyIdButton = null; // 暫時設為 null，避免後續代碼報錯
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
    const modalContent = document.getElementById('modal-content');

    // 彈窗 1: 開始畫面
    const startScreenUI = document.getElementById('start-screen-ui');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const startButton = document.getElementById('start-button');

    // 彈窗 2: 結算畫面
    const endgameScreenUI = document.getElementById('endgame-screen-ui');
    const endgameStats = document.getElementById('endgame-stats');
    const statsPositive = document.getElementById('stats-positive');
    const statsNegative = document.getElementById('stats-negative');
    const statsCorrect = document.getElementById('stats-correct');
    const statsWrong = document.getElementById('stats-wrong');

    // 彈窗 3: 問答畫面
    const questionArea = document.getElementById('question-area');
    const questionText = document.getElementById('question-text');
    const answerButtons = document.querySelectorAll('.answer-option');

    // ✨ 新增：IG 抽獎資訊輸入介面
    const igPromptArea = document.getElementById('ig-prompt-area');
    const igInput = document.getElementById('ig-input');
    const igCancelButton = document.getElementById('ig-cancel-button');
    const igSubmitButton = document.getElementById('ig-submit-button');

    // ✨ 新增：個人里程碑彈窗元素
    const openMilestoneButton = document.getElementById('open-milestone-button');
    const milestoneModal = document.getElementById('milestone-modal-overlay');
    const milestoneCloseButton = document.getElementById('milestone-close-button');
    const milestoneProgressBarFill = document.getElementById('milestone-progress-bar-fill');
    const milestoneCurrentScore = document.getElementById('milestone-current-score');
    const milestoneIgDisplay = document.getElementById('milestone-ig-display');
    const milestoneIgHandle = document.getElementById('milestone-ig-handle');
    const milestoneIgEditButton = document.getElementById('milestone-ig-edit-button');
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
    audio.birthday = new Audio('./audio/Happy Birthday_8bit.mp3');
    audio.birthday.loop = true;

    // --- 遊戲變數 (✨ 更新) ---
    let gameStarted = false;
    let score = 0;
    const player = {
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
        currentFrame: 0,
        frameCounter: 0,
        frameRate: GAME_CONFIG.PLAYER.ANIMATION_FRAME_RATE,
        idleFrames: [],
    };
    const keys = { left: false, right: false };
    let timeLeft = GAME_CONFIG.GAME_TIME;
    let gameTimerId = null;
    let isFeverTime = false;
    let feverMeter = 0;
    let feverDurationTimer = 0;
    let currentLang = 'zh-TW';
    let isMuted = false;
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
    let fallingItems = [];
    let baseSpawnInterval = GAME_CONFIG.BASE_SPAWN_INTERVAL, spawnInterval = baseSpawnInterval, spawnTimer = spawnInterval;
    let currentClaimingTier = null; // ✨ 新增：用來追蹤正在領取哪個 Tier
    let wasMilestoneModalOpen = false; // ✨ 新增：用來追蹤顯示 IG 輸入畫面時，個人里程碑視窗是否原本是開著的

    // --- ✨ 2. Firebase 匿名登入與初始化 ---
    let currentUserID = null;

    function handleAuthentication() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUserID = user.uid;
                console.log("Firebase 匿名登入成功，UID:", currentUserID);
                // ✨ 暫時隱藏：進度 ID 顯示（未來可能添加匯入進度 ID 功能）
                // if (userIdDisplay) {
                //     userIdDisplay.textContent = formatUserID(currentUserID);
                // }
                await loadPlayerProfile();
                await loadTotalMilestoneScore();
                showStartModalText();
            } else {
                console.log("使用者未登入，正在嘗試匿名登入...");
                try {
                    await auth.signInAnonymously();
                    console.log("匿名登入請求成功。");
                } catch (error) {
                    console.error("Firebase 匿名登入失敗:", error);
                    modalTitle.textContent = "登入失敗";
                    modalText.textContent = "無法連線至伺服器以驗證您的身份，請檢查網路連線後重新整理頁面。";
                    modal.classList.remove('hidden');
                }
            }
        });
    }

    // --- 資源載入 (省略) ---
    const idleFrameSources = ['./images/xiao-yuan-bao-idle-1.png', './images/xiao-yuan-bao-idle-2.png', './images/xiao-yuan-bao-idle-3.png', './images/xiao-yuan-bao-idle-4.png', './images/xiao-yuan-bao-idle-5.png', './images/xiao-yuan-bao-idle-6.png'];
    let assetsToLoad = 3 + GAME_CONFIG.ITEM_TYPES.length + idleFrameSources.length;
    let assetsLoaded = 0;
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingText = document.getElementById('loading-text');

    // ✨ 新增：載入提示與時間相關元素
    const loadingHint = document.getElementById('loading-hint');
    const loadingTime = document.getElementById('loading-time');
    const skeletonLayer = document.getElementById('skeleton-layer');
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
        loadingProgressBar.style.width = progress + '%';
        loadingText.textContent = `${progress}%`;

        // ✨ 更新提示文字
        const hintIndex = Math.min(Math.floor((progress / 100) * loadingHints.length), loadingHints.length - 1);
        if (loadingHint) loadingHint.textContent = loadingHints[hintIndex];

        // ✨ 計算並更新預估時間
        if (assetsLoaded > 0) {
            const elapsedTime = Date.now() - loadingStartTime;
            const averageTimePerAsset = elapsedTime / assetsLoaded;
            const remainingAssets = assetsToLoad - assetsLoaded;
            const estimatedRemainingTime = Math.ceil((averageTimePerAsset * remainingAssets) / 1000); // 秒

            if (loadingTime) {
                if (estimatedRemainingTime <= 0) {
                    loadingTime.textContent = "即將完成...";
                } else {
                    loadingTime.textContent = `預估剩餘時間: ${estimatedRemainingTime} 秒`;
                }
            }
        }
    }

    function onAssetLoad() {
        assetsLoaded++;
        updateLoadingProgress();
        if (assetsLoaded === assetsToLoad) {
            console.log("所有圖片資源載入完成！");
            player.image = player.defaultImage;
            player.loaded = true;
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                // ✨ 同時隱藏骨架屏
                if (skeletonLayer) skeletonLayer.classList.add('hidden');
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, GAME_CONFIG.UI.LOADING_FADE_DURATION);
            }, GAME_CONFIG.UI.LOADING_FADE_DELAY);
        }
    }

    function onAssetError(error) {
        console.error('資源載入失敗:', error);
        assetsLoaded++;
        updateLoadingProgress();
        if (assetsLoaded === assetsToLoad) {
            player.image = player.defaultImage;
            player.loaded = true;
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                // ✨ 同時隱藏骨架屏
                if (skeletonLayer) skeletonLayer.classList.add('hidden');
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, GAME_CONFIG.UI.LOADING_FADE_DURATION);
            }, GAME_CONFIG.UI.LOADING_FADE_DELAY);
        }
    }
    player.defaultImage.src = idleFrameSources[0]; player.defaultImage.onload = onAssetLoad; player.defaultImage.onerror = () => onAssetError('defaultImage');
    player.winImage.src = './images/xiao-yuan-bao-win.png'; player.winImage.onload = onAssetLoad; player.winImage.onerror = () => onAssetError('winImage');
    player.loseImage.src = './images/xiao-yuan-bao-lose.png'; player.loseImage.onload = onAssetLoad; player.loseImage.onerror = () => onAssetError('loseImage');

    // ✨ 新增：載入分享圖卡
    const shareCardImage = new Image();
    shareCardImage.src = './images/sharecard.PNG';
    shareCardImage.onload = onAssetLoad;
    shareCardImage.onerror = () => onAssetError('shareCardImage');

    GAME_CONFIG.ITEM_TYPES.forEach(type => { const img = new Image(); img.src = type.src; img.onload = onAssetLoad; img.onerror = () => onAssetError(type.id); itemImages[type.id] = img; });
    idleFrameSources.forEach((src, index) => { const img = new Image(); img.src = src; img.onload = onAssetLoad; img.onerror = () => onAssetError(`idleFrame-${index}`); player.idleFrames.push(img); });

    // --- 事件監聽 (省略) ---
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

    // --- 遊戲核心函式 (省略部分) ---
    function spawnItem() { const totalProbability = GAME_CONFIG.ITEM_TYPES.reduce((sum, item) => sum + item.probability, 0); let random = Math.random() * totalProbability; let chosenItemType; for (const itemType of GAME_CONFIG.ITEM_TYPES) { if (random < itemType.probability) { chosenItemType = itemType; break; } random -= itemType.probability; } if (!chosenItemType || !itemImages[chosenItemType.id] || !itemImages[chosenItemType.id].complete) { return; } fallingItems.push({ x: Math.random() * (canvas.width - GAME_CONFIG.ITEM_DEFAULT_SIZE), y: GAME_CONFIG.ITEM_SPAWN_Y_OFFSET, width: GAME_CONFIG.ITEM_DEFAULT_SIZE, height: GAME_CONFIG.ITEM_DEFAULT_SIZE, speed: chosenItemType.speed, score: chosenItemType.score, type: chosenItemType.type, image: itemImages[chosenItemType.id] }); }
    function checkCollision(obj1, obj2) { return obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x && obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y; }
    function playSound(audioObject, isSFX = true) { if (isMuted) return; if (!audioObject) return; if (isSFX) { audioObject.currentTime = 0; } audioObject.play().catch(error => { console.warn(`音效播放失敗: ${error.message}`); }); }
    function showScoreChange(score) { const scoreChangeElement = document.getElementById('score-change'); if (!scoreChangeElement) return; const scoreValue = parseInt(score, 10); if (isNaN(scoreValue) || scoreValue === 0) return; scoreChangeElement.textContent = (scoreValue > 0 ? '+' : '') + scoreValue; scoreChangeElement.classList.remove('positive', 'negative', 'show'); if (scoreValue > 0) { scoreChangeElement.classList.add('positive'); } else { scoreChangeElement.classList.add('negative'); } void scoreChangeElement.offsetWidth; scoreChangeElement.classList.add('show'); setTimeout(() => { scoreChangeElement.classList.remove('show'); }, GAME_CONFIG.UI.SCORE_CHANGE_DURATION); }
    function applyLanguage(lang) { if (!i18nStrings[lang]) { console.warn(`找不到語言 ${lang}，使用 zh-TW。`); lang = 'zh-TW'; } currentLang = lang; langSelect.value = lang; document.querySelectorAll('[data-i18n-key]').forEach(element => { const key = element.dataset.i18nKey; if (i18nStrings[lang][key]) { element.textContent = i18nStrings[lang][key]; } }); document.querySelectorAll('[data-i18n-key-placeholder]').forEach(element => { const key = element.dataset.i18nKeyPlaceholder; if (i18nStrings[lang][key]) { element.placeholder = i18nStrings[lang][key]; } }); document.title = i18nStrings[lang].modalStartTitle; showStartModalText(); }
    function detectLanguage() { let browserLang = navigator.language || navigator.userLanguage; if (browserLang.startsWith('en')) { applyLanguage('en'); } else if (browserLang.startsWith('zh')) { applyLanguage('zh-TW'); } else { applyLanguage('zh-TW'); } }
    function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]]; } return array; }

    // ========================================================================
    // --- ✨ 彈窗狀態管理 (✨ 重大更新) ✨ ---
    // ========================================================================

    // 隱藏所有主彈窗中的 UI 畫面
    function hideAllModalScreens() {
        startScreenUI.classList.add('hidden');
        endgameScreenUI.classList.add('hidden');
        questionArea.classList.add('hidden');
        igPromptArea.classList.add('hidden');
    }

    // 顯示開始畫面
    function showStartModalText() {
        hideAllModalScreens();
        startScreenUI.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    // ✨ 修改：顯示 IG 輸入畫面（支援修改模式）
    function showIgPrompt(tier) {
        currentClaimingTier = tier; // 記錄正在領取的獎勵（null 表示修改模式）
        hideAllModalScreens();

        // ✨ 修正：如果個人里程碑視窗是開著的，暫時隱藏它
        wasMilestoneModalOpen = !milestoneModal.classList.contains('hidden');
        if (wasMilestoneModalOpen) {
            milestoneModal.classList.add('hidden');
        }

        // ✨ 修正：動態設置更多屬性來防止瀏覽器擴充功能干擾
        igInput.setAttribute('autocomplete', 'off');
        igInput.setAttribute('data-lpignore', 'true');
        igInput.setAttribute('data-1p-ignore', 'true');
        igInput.setAttribute('data-bwignore', 'true');
        igInput.setAttribute('data-form-type', 'other');
        igInput.setAttribute('name', 'ig-handle-input'); // 設置一個非標準的 name 屬性

        // 如果玩家已經填過，預先填入輸入框
        if (playerProfile.instagramHandle) {
            igInput.value = playerProfile.instagramHandle;
        } else {
            igInput.value = '';
        }

        igPromptArea.classList.remove('hidden');
        modal.classList.remove('hidden');

        // ✨ 延遲焦點，避免擴充功能在元素顯示時立即觸發
        setTimeout(() => {
            igInput.focus();
        }, 100);
    }

    // ✨ 新增：隱藏 IG 輸入畫面
    function hideIgPrompt() {
        igPromptArea.classList.add('hidden');

        // ✨ 修正：如果之前個人里程碑視窗是開著的，重新顯示它
        if (wasMilestoneModalOpen) {
            wasMilestoneModalOpen = false; // 重置標記
            showMilestoneModal(false); // 重新顯示個人里程碑視窗

            // ✨ 錯誤修復：確保主選單在背景中保持可見
            startScreenUI.classList.remove('hidden');
            modal.classList.remove('hidden');
        } else {
            showStartModalText(); // 否則回到開始畫面
        }
    }

    // ✨ 修改：顯示個人里程碑彈窗 (垂直列表新版)
    async function showMilestoneModal(isEndGameFlow = false) {
        await loadPlayerProfile();

        const currentScore = playerProfile.cumulativeScore;
        milestoneCurrentScore.textContent = new Intl.NumberFormat().format(currentScore);

        // ✨ 新增：顯示或隱藏 IG 帳號區域
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
            milestoneCloseButton.onclick = () => { milestoneModal.classList.add('hidden'); };
        }

        milestoneModal.classList.remove('hidden');
    }

    function showPersonalMilestoneStep() { modal.classList.add('hidden'); showMilestoneModal(true); }
    async function showGlobalMilestoneModal(isEndGameFlow = false) { const progressPercent = await loadTotalMilestoneScore(true); globalMilestoneProgressBarFill.style.width = progressPercent; globalMilestoneCurrentPercent.textContent = progressPercent; if (isEndGameFlow) { globalMilestoneCloseButton.classList.add('hidden'); globalMilestoneRestartButton.classList.remove('hidden'); globalMilestoneShareButton.classList.remove('hidden'); globalMilestoneRestartButton.onclick = closeSettlementAndCheckBirthday; globalMilestoneShareButton.onclick = copyShareText; } else { globalMilestoneCloseButton.classList.remove('hidden'); globalMilestoneRestartButton.classList.add('hidden'); globalMilestoneShareButton.classList.add('hidden'); globalMilestoneCloseButton.onclick = () => { globalMilestoneModal.classList.add('hidden'); }; } globalMilestoneModal.classList.remove('hidden'); }
    function showGlobalMilestoneStep() { milestoneModal.classList.add('hidden'); showGlobalMilestoneModal(true); }

    // --- 遊戲狀態函式 (✨ 更新) ---
    function showQuestion() {
        gameStarted = false;
        clearGameTimers();
        audio.bgm.pause();
        audio.bgmFever.pause();

        if (typeof QUESTION_BANK === 'undefined' || QUESTION_BANK.length === 0) { console.error("錯誤：題庫 (QUESTION_BANK) 未定義或為空！"); resumeGame(); return; }
        const qIndex = Math.floor(Math.random() * QUESTION_BANK.length);
        const selectedQuestion = QUESTION_BANK[qIndex];
        const qData = selectedQuestion[currentLang];
        if (!qData) { console.error(`找不到題目 ${selectedQuestion.id} 的 ${currentLang} 語言資料`); resumeGame(); return; }
        let options = [...qData.incorrectAnswers, qData.correctAnswer];
        shuffleArray(options);

        hideAllModalScreens();
        questionArea.classList.remove('hidden');

        questionText.textContent = qData.question;
        answerButtons.forEach((button, index) => {
            button.textContent = options[index];
            button.dataset.correct = (options[index] === qData.correctAnswer) ? "true" : "false";
        });
        modal.classList.remove('hidden');
    }

    function handleAnswer(event) { const clickedButton = event.target; const isCorrect = clickedButton.dataset.correct === "true"; answerButtons.forEach(btn => btn.disabled = true); if (isCorrect) { let bonusPoints = GAME_CONFIG.SCORING.CORRECT_ANSWER; if (isFeverTime) bonusPoints *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER; score += bonusPoints; player.image = player.winImage; playSound(audio.answerCorrect); stats_questions_correct++; } else { score += GAME_CONFIG.SCORING.INCORRECT_ANSWER; player.image = player.loseImage; playSound(audio.answerIncorrect); stats_questions_wrong++; } scoreDisplay.textContent = score; player.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION; let correctButton = null; answerButtons.forEach(btn => { if (btn.dataset.correct === "true") { correctButton = btn; } }); if (isCorrect) { clickedButton.classList.add('correct-answer'); } else { clickedButton.classList.add('incorrect-answer'); if (correctButton) { correctButton.classList.add('correct-answer'); } } setTimeout(resumeGame, GAME_CONFIG.UI.POST_ANSWER_DELAY); }
    function resumeGame() { answerButtons.forEach(btn => { btn.disabled = false; btn.classList.remove('correct-answer', 'incorrect-answer'); }); modal.classList.add('hidden'); gameStarted = true; clearGameTimers(); gameTimerId = setInterval(updateTimer, 1000); if (isMuted) return; if (isFeverTime) { playSound(audio.bgmFever, false); } else { playSound(audio.bgm, false); } }
    function updateTimer() { timeLeft--; timeDisplay.textContent = `${timeLeft}s`; if (timeLeft <= 0) { endGame(); } }
    function activateFeverTime() { if (isFeverTime) return; isFeverTime = true; feverDurationTimer = GAME_CONFIG.FEVER.DURATION; spawnInterval = Math.floor(baseSpawnInterval * GAME_CONFIG.FEVER.SPAWN_INTERVAL_MULTIPLIER); audio.bgm.pause(); audio.bgm.currentTime = 0; audio.bgmFever.loop = true; playSound(audio.bgmFever, false); console.log("FEVER TIME ACTIVATED!"); }
    function endFeverTime() { if (!isFeverTime) return; isFeverTime = false; feverMeter = 0; feverDurationTimer = 0; spawnInterval = baseSpawnInterval; audio.bgmFever.pause(); audio.bgmFever.currentTime = 0; playSound(audio.bgm, false); console.log("FEVER TIME ENDED."); }

    // --- ✨ 新增：分享功能相關函式 ---

    // 全域變數儲存當前選擇的格式
    let currentShareFormat = 'square'; // 'square' 或 'story'

    /**
     * 生成 QR Code 的 Data URL
     * @param {string} url - 要編碼的網址
     * @param {number} size - QR Code 大小
     * @returns {string} Data URL
     */
    function generateQRCode(url, size = 4) {
        const qr = qrcode(0, 'M'); // 0 = 自動選擇最佳版本, 'M' = 中等錯誤修正
        qr.addData(url);
        qr.make();
        return qr.createDataURL(size); // size 是每個模組的像素大小
    }

    /**
     * 生成成績圖卡
     * @param {Object} gameStats - 遊戲統計資料
     * @param {string} format - 圖卡格式 ('square' 或 'story')
     * @returns {Promise<string>} 圖片 Data URL
     */
    async function generateScoreCard(gameStats, format = 'square') {
        return new Promise((resolve) => {
            const canvas = document.getElementById('scoreCardCanvas');
            const ctx = canvas.getContext('2d');

            // 根據格式設定 Canvas 尺寸
            if (format === 'story') {
                // Instagram 限時動態最佳尺寸
                canvas.width = 1080;
                canvas.height = 1920;
            } else {
                // 通用方形格式 (適合貼文)
                canvas.width = 1080;
                canvas.height = 1080;
            }

            const width = canvas.width;
            const height = canvas.height;

            // 繪製背景漸層
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 計算內容區域 (根據格式調整)
            const padding = 80;
            const contentWidth = width - (padding * 2);
            const contentHeight = height - (padding * 2);

            // 繪製白色內容區塊
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.roundRect(padding, padding, contentWidth, contentHeight, 30);
            ctx.fill();

            // 計算垂直間距 (根據格式調整)
            const isStory = format === 'story';
            const titleY = isStory ? 200 : 180;
            const subtitleY = titleY + 60;
            const dividerY = subtitleY + 40;
            const statsStartY = dividerY + 80;
            const statsSpacing = isStory ? 100 : 90;
            const qrSectionY = isStory ? height - 500 : 740;

            // 繪製標題
            ctx.fillStyle = '#2d3748';
            ctx.font = 'bold 72px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎮 2026 Happy Yuan Day', width / 2, titleY);

            // 繪製副標題
            ctx.font = '36px Arial, sans-serif';
            ctx.fillStyle = '#4a5568';
            ctx.fillText('媛來接力 - 遊戲成績', width / 2, subtitleY);

            // 繪製分隔線
            ctx.strokeStyle = '#cbd5e0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(padding + 100, dividerY);
            ctx.lineTo(width - padding - 100, dividerY);
            ctx.stroke();

            // 繪製成績資訊
            const stats = [
                { label: '本局分數', value: gameStats.score, emoji: '⭐' },
                { label: '接到物品', value: gameStats.itemsCaught, emoji: '🎯' },
                { label: '答對題數', value: gameStats.correctAnswers, emoji: '✅' },
                { label: '答錯題數', value: gameStats.wrongAnswers, emoji: '❌' },
            ];

            ctx.textAlign = 'left';
            let yPosition = statsStartY;

            stats.forEach(stat => {
                const leftMargin = padding + 100;
                const rightMargin = width - padding - 100;

                // 繪製 emoji
                ctx.font = '48px Arial';
                ctx.fillText(stat.emoji, leftMargin, yPosition);

                // 繪製標籤
                ctx.font = 'bold 42px Arial, sans-serif';
                ctx.fillStyle = '#2d3748';
                ctx.fillText(stat.label, leftMargin + 80, yPosition);

                // 繪製數值
                ctx.font = 'bold 48px Arial, sans-serif';
                ctx.fillStyle = '#667eea';
                ctx.textAlign = 'right';
                ctx.fillText(String(stat.value), rightMargin, yPosition);
                ctx.textAlign = 'left';

                yPosition += statsSpacing;
            });

            // 繪製 QR Code 說明 (已移除)
            // ctx.textAlign = 'center';
            // ctx.font = '32px Arial, sans-serif';
            // ctx.fillStyle = '#4a5568';
            // ctx.fillText('掃描 QR Code 開始挑戰', width / 2, qrSectionY);

            // 生成並繪製 QR Code
            const gameURL = window.location.href; // 使用當前遊戲網址
            const qrDataURL = generateQRCode(gameURL, 6);

            const qrImage = new Image();
            qrImage.onload = () => {
                // ✨ 更新：重新規劃 QR Code 和分享圖卡的位置
                const qrSize = isStory ? 220 : 200;
                const qrX = width - padding - qrSize - 50;
                const qrY = height - padding - qrSize - 50;

                // 繪製 QR Code 背景
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

                // 繪製 QR Code
                ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

                // ✨ 新增：繪製分享圖卡
                if (shareCardImage && shareCardImage.complete) {
                    const cardAspectRatio = shareCardImage.width / shareCardImage.height;
                    let cardWidth, cardHeight, cardX, cardY;

                    if (isStory) {
                        // 限動模式：放在左下角探頭
                        cardHeight = 700;
                        cardWidth = cardHeight * cardAspectRatio;
                        cardX = padding - 80;
                        cardY = height - cardHeight - padding + 120;
                    } else {
                        // 方形模式：放在左下角探頭
                        cardHeight = 490;
                        cardWidth = cardHeight * cardAspectRatio;
                        cardX = padding - 80;
                        cardY = height - cardHeight - padding + 100;
                    }
                    ctx.drawImage(shareCardImage, cardX, cardY, cardWidth, cardHeight);
                }

                // 如果是限時動態格式，加入底部提示
                if (isStory) {
                    ctx.font = 'bold 28px Arial, sans-serif';
                    ctx.fillStyle = '#667eea';
                    ctx.textAlign = 'center';
                    ctx.fillText('👆 立即挑戰', qrX + qrSize / 2, qrY + qrSize + 40);
                }

                // 轉換成 Data URL
                const imageDataURL = canvas.toDataURL('image/png', 0.95);
                resolve(imageDataURL);
            };
            qrImage.src = qrDataURL;
        });
    }

    /**
     * 切換分享格式並重新生成圖卡
     */
    async function switchShareFormat(format) {
        currentShareFormat = format;

        // 更新按鈕狀態
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-format="${format}"]`).classList.add('active');

        // 更新提示文字
        const shareTipElement = document.getElementById('share-tip');
        if (shareTipElement) {
            const tipText = format === 'story'
                ? i18nStrings[currentLang].shareTipStory
                : i18nStrings[currentLang].shareTipSquare;
            shareTipElement.textContent = tipText;
        }

        // 重新生成圖卡
        const gameStats = window.currentGameStats; // 從全域變數取得
        const newImageURL = await generateScoreCard(gameStats, format);

        // 更新全域變數
        window.currentScoreCardURL = newImageURL;
    }

    /**
     * 下載圖片
     * @param {string} dataURL - 圖片 Data URL
     */
    function downloadImage(dataURL) {
        const formatSuffix = currentShareFormat === 'story' ? 'story' : 'square';
        const filename = `yuan-game-score-${formatSuffix}-${Date.now()}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 分享圖片到社群媒體 (優化 Instagram 限時動態體驗)
     * @param {string} dataURL - 圖片 Data URL
     * @param {Object} gameStats - 遊戲統計資料
     */
    async function shareImage(dataURL, gameStats) {
        try {
            // 將 Data URL 轉換成 Blob
            const response = await fetch(dataURL);
            const blob = await response.blob();

            // 根據格式設定檔案名稱
            const formatSuffix = currentShareFormat === 'story' ? 'story' : 'square';
            const filename = `yuan-game-${formatSuffix}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            // 客製化分享文字
            const shareTitle = '2026 Happy Yuan Day - 媛來接力';
            const shareText = currentShareFormat === 'story'
                ? `我在「媛來接力」得到 ${gameStats.score} 分！🎮\n快來挑戰看看你能得幾分！`
                : `我的遊戲成績：${gameStats.score} 分 🎯\n一起來「媛來接力」玩遊戲！`;

            // 檢查瀏覽器是否支援 Web Share API
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    files: [file]
                });

                console.log('✅ 分享成功！');

            } else {
                // 降級方案：直接下載並顯示提示
                console.log('⚠️ 瀏覽器不支援 Web Share API，使用下載方案');
                downloadImage(dataURL);
                showShareTip();
            }

        } catch (error) {
            // 處理錯誤
            if (error.name === 'AbortError') {
                // 使用者取消分享，不需顯示錯誤
                console.log('ℹ️ 使用者取消分享');
            } else {
                console.error('❌ 分享失敗:', error);
                // 發生錯誤時降級為下載
                downloadImage(dataURL);
                showShareTip();
            }
        }
    }

    /**
     * 顯示手動分享提示 (當 Web Share API 不可用時)
     */
    function showShareTip() {
        const tipMessage = currentShareFormat === 'story'
            ? '✨ 圖片已下載！\n\n請至相簿選擇圖片，然後:\n1. 開啟 Instagram\n2. 點選左上角「+」建立限時動態\n3. 選擇剛下載的圖片\n4. 直接分享到限動！'
            : '✨ 圖片已下載！\n\n您可以:\n1. 分享到 Instagram 貼文\n2. 傳送給朋友\n3. 發布到其他社群平台';

        alert(tipMessage);
    }

    async function endGame() {
        gameStarted = false;
        clearGameTimers();
        audio.bgm.pause(); audio.bgm.currentTime = 0;
        audio.bgmFever.pause(); audio.bgmFever.currentTime = 0;
        playSound(audio.gameOver);

        endgameTitle.textContent = i18nStrings[currentLang].modalEndTitle;

        currentStats = { statsPositive: stats_items_positive, statsNegative: stats_items_negative, statsCorrect: stats_questions_correct, statsWrong: stats_questions_wrong, statsTime: totalGameTime, statsFeverCount: stats_feverCount, statsFeverTime: stats_feverTime, };

        hideAllModalScreens();
        endgameScreenUI.classList.remove('hidden');
        modal.classList.remove('hidden');

        if (score > 0) {
            if (navigator.onLine) {
                uploadScore(score);
            } else {
                // Construct the data object for offline storage
                const scoreData = {
                    userId: currentUserID,
                    score: score,
                    timestamp: new Date().toISOString(), // Use ISO string for client-side timestamp
                    version: GAME_CONFIG.VERSION,
                    isBirthday: isBirthdayToday(),
                    stats: currentStats,
                };
                // Call the offline handler
                if (window.offlineManager && typeof window.offlineManager.saveScoreOffline === 'function') {
                    window.offlineManager.saveScoreOffline(scoreData);
                } else {
                    console.error("Offline manager is not available.");
                    // Fallback alert if offline handler isn't loaded
                    alert("目前為離線狀態，但無法暫存您的分數。");
                }
            }
        }

        // --- ✨ 分享功能整合 ---
        // 1. 收集遊戲統計資料
        const gameStats = {
            score: score,
            itemsCaught: stats_items_positive,
            correctAnswers: stats_questions_correct,
            wrongAnswers: stats_questions_wrong,
        };

        // 2. 儲存到全域變數供後續使用
        window.currentGameStats = gameStats;

        // 3. 生成預設格式的成績圖卡 (方形)
        currentShareFormat = 'square';
        // ✨ 確保按鈕回到預設狀態
        document.querySelector('[data-format="square"]').classList.add('active');
        document.querySelector('[data-format="story"]').classList.remove('active');

        const scoreCardURL = await generateScoreCard(gameStats, currentShareFormat);
        window.currentScoreCardURL = scoreCardURL;

        // 4. 顯示分享區塊
        document.getElementById('share-section').style.display = 'block';

        // 5. 綁定格式切換按鈕事件
        document.getElementById('formatSquareBtn').onclick = () => {
            switchShareFormat('square');
        };

        document.getElementById('formatStoryBtn').onclick = () => {
            switchShareFormat('story');
        };

        // 6. 綁定下載按鈕事件
        document.getElementById('downloadScoreBtn').onclick = () => {
            downloadImage(window.currentScoreCardURL);
        };

        // 7. 綁定分享按鈕事件
        document.getElementById('shareScoreBtn').onclick = () => {
            shareImage(window.currentScoreCardURL, gameStats);
        };

        // 原始的繼續按鈕邏輯
        endgameContinueButton.onclick = showPersonalMilestoneStep;
    }
    function closeSettlementAndCheckBirthday() { modal.classList.add('hidden'); milestoneModal.classList.add('hidden'); globalMilestoneModal.classList.add('hidden'); if (isBirthdayToday()) { birthdayMessage.textContent = i18nStrings[currentLang].birthdayMessage; birthdayModal.classList.remove('hidden'); playSound(audio.birthday, false); } else { restartGame(); } }
    function copyShareText() { const shareSuccessText = i18nStrings[currentLang].shareSuccess || '分享文案已複製到剪貼簿！'; const shareFailureText = i18nStrings[currentLang].shareFailure || '複製失敗，請手動複製！'; const currentScore = score; const cumulativeScore = playerProfile.cumulativeScore; const globalProgress = globalMilestoneCurrentPercent.textContent; let shareText = i18nStrings[currentLang].shareTextTemplate; shareText = shareText.replace('{score}', currentScore); shareText = shareText.replace('{cumulativeScore}', cumulativeScore); shareText = shareText.replace('{globalProgress}', globalProgress); navigator.clipboard.writeText(shareText).then(() => { alert(shareSuccessText); }).catch(err => { console.error('複製失敗: ', err); alert(shareFailureText + '\n' + shareText); }); }
    function resetGame() { score = 0; timeLeft = GAME_CONFIG.GAME_TIME; isFeverTime = false; feverMeter = 0; feverDurationTimer = 0; fallingItems = []; player.x = canvas.width / 2 - GAME_CONFIG.PLAYER.WIDTH / 2; spawnInterval = baseSpawnInterval; spawnTimer = spawnInterval; stats_items_positive = 0; stats_items_negative = 0; stats_questions_correct = 0; stats_questions_wrong = 0; scoreDisplay.textContent = `0`; timeDisplay.textContent = `${timeLeft}s`; milestoneProgress.textContent = `0%`; if (player.loaded) player.image = player.defaultImage; player.currentFrame = 0; player.frameCounter = 0; }
    function startGame() { gameStarted = true; clearGameTimers(); resetGame(); modal.classList.add('hidden'); gameTimerId = setInterval(updateTimer, 1000); playSound(audio.gameStart); playSound(audio.bgm, false); stats_positive = 0; stats_negative = 0; stats_correct = 0; stats_wrong = 0; stats_feverCount = 0; stats_feverTime = 0; }
    function restartGame() { birthdayModal.classList.add('hidden'); audio.birthday.pause(); audio.birthday.currentTime = 0; showStartModalText(); }

    // --- 資料庫相關函式 (✨ 重大更新) ---

    async function uploadScore(score) {
        if (!currentUserID || !db) {
            console.log("尚未取得 UserID 或 DB，無法上傳分數。");
            return;
        }

        const batch = db.batch();
        const scoreRef = db.collection('scores').doc();
        const scoreData = {
            userId: currentUserID,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            version: GAME_CONFIG.VERSION,
            isBirthday: isBirthdayToday(),
            stats: currentStats,
        };
        batch.set(scoreRef, scoreData);

        const playerRef = db.collection('players').doc(currentUserID);

        // 檢查玩家資料是否存在以及缺少哪些欄位
        try {
            const playerDoc = await playerRef.get();
            const existingData = playerDoc.exists ? playerDoc.data() : {};

            // 定義所有必要的欄位及其預設值
            const requiredFields = {
                claimedTier1: false,
                tier2Qualified: false,
                tier3Qualified: false,
                instagramHandle: null
            };

            // 檢查缺少的欄位
            const missingFields = {};
            let hasMissingFields = false;
            for (const [field, defaultValue] of Object.entries(requiredFields)) {
                if (!(field in existingData)) {
                    missingFields[field] = defaultValue;
                    hasMissingFields = true;
                }
            }

            if (!playerDoc.exists) {
                // 如果玩家資料不存在，建立完整的初始資料
                const initialPlayerData = {
                    cumulativeScore: score,
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    ...requiredFields
                };
                batch.set(playerRef, initialPlayerData);
                console.log("建立新的玩家資料，包含所有必要欄位");
            } else if (hasMissingFields) {
                // 如果玩家資料存在但缺少某些欄位，補上缺少的欄位
                const updateData = {
                    cumulativeScore: firebase.firestore.FieldValue.increment(score),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    ...missingFields
                };
                batch.set(playerRef, updateData, { merge: true });
                console.log("更新玩家資料並補上缺少的欄位:", Object.keys(missingFields));
            } else {
                // 如果玩家資料已存在且完整，只更新分數相關欄位
                const playerData = {
                    cumulativeScore: firebase.firestore.FieldValue.increment(score),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                };
                batch.set(playerRef, playerData, { merge: true });
                console.log("更新現有玩家資料的分數");
            }

            await batch.commit();
            console.log("分數上傳與個人總分累加成功 (Batch Commit)！");
            playerProfile.cumulativeScore += score;
        } catch (error) {
            console.error("分數上傳或個人總分累加失敗:", error);
        }
    }
    async function loadTotalMilestoneScore(isEndGame = false) { if (!db) return '0%'; let totalScore = 0; let progressPercent = '0%'; try { const querySnapshot = await db.collection("scores").get(); querySnapshot.forEach((doc) => { totalScore += doc.data().score; }); console.log("目前里程碑總分: ", totalScore); const milestoneTarget = GAME_CONFIG.MILESTONES.GLOBAL_TARGET; progressPercent = Math.min(100, (totalScore / milestoneTarget) * 100).toFixed(1) + '%'; milestoneProgress.textContent = progressPercent; } catch (error) { console.error("讀取總分失敗: ", error); } return progressPercent; }
    async function loadPlayerProfile() { if (!currentUserID || !db) { console.log("尚未取得 UserID 或 DB，無法讀取個人資料。"); return; } const playerRef = db.collection('players').doc(currentUserID); try { const doc = await playerRef.get(); if (doc.exists) { console.log("成功讀取玩家資料:", doc.data()); playerProfile = { ...{ cumulativeScore: 0, claimedTier1: false, tier2Qualified: false, tier3Qualified: false, instagramHandle: null }, ...doc.data() }; } else { console.log("找不到玩家資料，將在遊戲結束後自動建立。"); } } catch (error) { console.error("讀取玩家資料失敗:", error); } }

    // ✨ 修改：提交 IG 帳號（支援修改模式）
    async function submitIgHandle() {
        const handle = igInput.value.trim();
        if (!handle) {
            alert(i18nStrings[currentLang].igEmptyInputError);
            return;
        }

        if (!currentUserID || !db) {
            alert(i18nStrings[currentLang].igSaveError);
            return;
        }

        const playerRef = db.collection('players').doc(currentUserID);

        try {
            igSubmitButton.disabled = true; // 防止重複點擊

            if (currentClaimingTier) {
                // 領取獎勵模式：更新 IG 帳號並標記對應 tier 為已獲得資格
                const tierField = `tier${currentClaimingTier}Qualified`;
                await playerRef.update({
                    instagramHandle: handle,
                    [tierField]: true
                });
                playerProfile.instagramHandle = handle;
                playerProfile[tierField] = true;
            } else {
                // 修改模式：只更新 IG 帳號
                await playerRef.update({
                    instagramHandle: handle
                });
                playerProfile.instagramHandle = handle;
            }

            alert(i18nStrings[currentLang].igSaveSuccess);
            hideIgPrompt();
            showMilestoneModal(); // 重新整理里程碑畫面

        } catch (error) {
            console.error('更新 IG 帳號失敗:', error);
            alert(i18nStrings[currentLang].igSaveError);
        } finally {
            igSubmitButton.disabled = false; // 解除按鈕鎖定
        }
    }

    // ✨ 新增：修改 IG 帳號
    function editIgHandle() {
        // 如果已經有 IG 帳號，顯示修改畫面
        if (playerProfile.instagramHandle) {
            // 設定為修改模式（不指定 tier，只更新 IG 帳號）
            currentClaimingTier = null;
            showIgPrompt(null);
        }
    }

    // ✨ 重構：領取獎勵函式
    async function claimReward(tier) {
        if (!currentUserID || !db) {
            alert(i18nStrings[currentLang].igSaveError);
            return;
        }

        const scoreThresholds = {
            1: GAME_CONFIG.MILESTONES.PERSONAL.TIER_1_SCORE,
            2: GAME_CONFIG.MILESTONES.PERSONAL.TIER_2_SCORE,
            3: GAME_CONFIG.MILESTONES.PERSONAL.TIER_3_SCORE,
        };

        // 檢查分數是否足夠
        if (playerProfile.cumulativeScore < scoreThresholds[tier]) return;

        switch (tier) {
            case 1:
                // Tier 1: 直接下載
                window.open(GAME_CONFIG.MILESTONES.REWARDS.TIER_1_URL, '_blank');
                break;
            case 2:
                // Tier 2: 如果已獲得資格，不做任何事；否則顯示輸入 IG 畫面
                if (playerProfile.tier2Qualified) {
                    // 已經獲得資格，不需要再次輸入
                    return;
                } else {
                    // 未獲得資格，顯示輸入 IG 畫面
                    showIgPrompt(tier);
                }
                break;
            case 3:
                // Tier 3: 如果已獲得資格，不做任何事；如果已有 IG 帳號，直接顯示成功訊息；否則顯示輸入畫面
                if (playerProfile.tier3Qualified) {
                    // 已經獲得資格，不需要再次處理
                    return;
                } else if (playerProfile.instagramHandle) {
                    // 已有 IG 帳號但未獲得資格，直接標記為已獲得資格並顯示成功訊息
                    const playerRef = db.collection('players').doc(currentUserID);
                    try {
                        await playerRef.update({
                            tier3Qualified: true
                        });
                        playerProfile.tier3Qualified = true;
                        alert(i18nStrings[currentLang].tier3ClaimSuccess || i18nStrings[currentLang].igSaveSuccess);
                        showMilestoneModal(); // 重新整理里程碑畫面
                    } catch (error) {
                        console.error('更新 Tier 3 資格失敗:', error);
                        alert(i18nStrings[currentLang].igSaveError);
                    }
                } else {
                    // 沒有 IG 帳號，顯示輸入畫面
                    showIgPrompt(tier);
                }
                break;
            default:
                return;
        }
    }

    function clearGameTimers() { if (gameTimerId !== null) { clearInterval(gameTimerId); gameTimerId = null; } }

    // --- 核心 Update & Draw 函式 (省略) ---
    function update() { if (!gameStarted) return; if (keys.left && player.x > 0) player.x -= player.speed; if (keys.right && player.x < canvas.width - player.width) player.x += player.speed; spawnTimer--; if (spawnTimer <= 0) { spawnItem(); spawnTimer = spawnInterval; } if (isFeverTime) { feverDurationTimer--; if (feverDurationTimer <= 0) { endFeverTime(); } } milestoneProgress.textContent = `${feverMeter}%`; for (let i = fallingItems.length - 1; i >= 0; i--) { const item = fallingItems[i]; item.y += item.speed; if (checkCollision(player, item)) { let pointsToChange = 0; let feverBoost = 0; if (item.type === 'positive') { pointsToChange = item.score; feverBoost = GAME_CONFIG.FEVER.POSITIVE_ITEM_BOOST; if (isFeverTime) pointsToChange *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER; player.image = player.winImage; playSound(audio.collectPositive); stats_items_positive++; } else if (item.type === 'special') { pointsToChange = item.score; feverBoost = GAME_CONFIG.FEVER.SPECIAL_ITEM_BOOST; if (isFeverTime) pointsToChange *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER; player.image = player.winImage; playSound(audio.collectSpecial); stats_items_positive++; } else if (item.type === 'negative') { pointsToChange = -item.score; player.image = player.loseImage; playSound(audio.collectNegative); stats_items_negative++; } else if (item.type === 'question') { playSound(audio.collectQuestion); showQuestion(); } feverMeter = Math.min(GAME_CONFIG.FEVER.MAX_METER, feverMeter + feverBoost); if (feverMeter >= GAME_CONFIG.FEVER.MAX_METER && !isFeverTime) { activateFeverTime(); } if (item.type !== 'question') { score += pointsToChange; showScoreChange(pointsToChange); scoreDisplay.textContent = score; player.animationTimer = GAME_CONFIG.PLAYER.WIN_LOSE_ANIMATION_DURATION; } fallingItems.splice(i, 1); } else if (item.y > canvas.height) { fallingItems.splice(i, 1); } } if (player.animationTimer > 0) { player.animationTimer--; } else { player.frameCounter++; if (player.frameCounter >= player.frameRate) { player.currentFrame = (player.currentFrame + 1) % player.idleFrames.length; player.frameCounter = 0; } } }
    function draw() { ctx.clearRect(0, 0, canvas.width, canvas.height); let imageToDraw; if (player.animationTimer > 0) { imageToDraw = player.image; } else { if (player.idleFrames.length > 0) { imageToDraw = player.idleFrames[player.currentFrame]; } else { imageToDraw = player.defaultImage; } } if (imageToDraw && imageToDraw.complete) { ctx.drawImage(imageToDraw, player.x, player.y, player.width, player.height); } else if (player.defaultImage.complete) { ctx.drawImage(player.defaultImage, player.x, player.y, player.width, player.height); } else { ctx.fillStyle = '#f72585'; ctx.fillRect(player.x, player.y, player.width, player.height); } fallingItems.forEach(item => { if (item.image && item.image.complete) { ctx.drawImage(item.image, item.x, item.y, item.width, item.height); } }); }

    function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

    // ========================================================================
    // --- 遊戲啟動邏輯 (✨ 更新: 綁定新按鈕) ---
    // ========================================================================

    // --- 綁定主要按鈕 ---
    startButton.onclick = startGame;
    answerButtons.forEach(button => { button.addEventListener('click', handleAnswer); });
    muteButton.addEventListener('click', () => { isMuted = !isMuted; muteButton.textContent = isMuted ? '🔇' : '🔊'; muteButton.classList.toggle('muted', isMuted); if (isMuted) { audio.bgm.pause(); audio.bgmFever.pause(); } else if (gameStarted && !isFeverTime) { playSound(audio.bgm, false); } });
    langSelect.addEventListener('change', (event) => { applyLanguage(event.target.value); });
    birthdayCloseButton.addEventListener('click', restartGame);

    // ✨ 暫時隱藏：綁定 ID 複製按鈕（未來可能添加匯入進度 ID 功能）
    // copyIdButton.addEventListener('click', () => { 
    //     if (!navigator.clipboard) { 
    //         alert("瀏覽器不支援，請手動選取複製您的完整 ID:\n" + currentUserID); 
    //         return; 
    //     } 
    //     navigator.clipboard.writeText(currentUserID).then(() => { 
    //         const originalText = copyIdButton.innerHTML; 
    //         copyIdButton.textContent = i18nStrings[currentLang].copiedButton; 
    //         setTimeout(() => { 
    //             copyIdButton.innerHTML = originalText; 
    //             applyLanguage(currentLang); 
    //         }, GAME_CONFIG.UI.COPY_SUCCESS_DELAY); 
    //     }).catch(err => { 
    //         console.error('複製失敗: ', err); 
    //         alert("複製失敗:\n" + currentUserID); 
    //     }); 
    // });

    // --- 綁定里程碑與抽獎按鈕 ---
    openMilestoneButton.addEventListener('click', () => showMilestoneModal(false));
    milestoneCloseButton.addEventListener('click', () => { milestoneModal.classList.add('hidden'); });
    openGlobalMilestoneButton.addEventListener('click', () => showGlobalMilestoneModal(false));

    // ✨ 更新：領取獎勵按鈕綁定
    claimTier1Button.addEventListener('click', () => claimReward(1));
    claimTier2Button.addEventListener('click', () => claimReward(2));
    claimTier3Button.addEventListener('click', () => claimReward(3));

    // ✨ 新增：IG 抽獎介面按鈕綁定
    igCancelButton.addEventListener('click', hideIgPrompt);
    igSubmitButton.addEventListener('click', submitIgHandle);

    // ✨ 新增：IG 帳號修改按鈕綁定
    if (milestoneIgEditButton) {
        milestoneIgEditButton.addEventListener('click', editIgHandle);
    }

    // ✨ 修正：在初始化時就設置輸入欄位的防護屬性
    if (igInput) {
        igInput.setAttribute('autocomplete', 'off');
        igInput.setAttribute('data-lpignore', 'true');
        igInput.setAttribute('data-1p-ignore', 'true');
        igInput.setAttribute('data-bwignore', 'true');
        igInput.setAttribute('data-form-type', 'other');
        igInput.setAttribute('name', 'ig-handle-input');

        // 添加事件監聽器來阻止擴充功能的預設行為
        igInput.addEventListener('focus', function (e) {
            // 阻止某些擴充功能的行為
            e.stopPropagation();
        }, true);

        igInput.addEventListener('click', function (e) {
            e.stopPropagation();
        }, true);
    }

    // --- ✨ 3. 啟動 ---
    gameLoop();
    detectLanguage();
    handleAuthentication(); // ✨ 啟動認證流程
});