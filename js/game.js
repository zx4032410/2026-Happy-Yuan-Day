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
    const inputManager = new InputManager();
    let itemManager;
    let effectManager;

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // ✨ 手機版畫布高度優化：根據螢幕寬度動態調整 canvas 實際尺寸
    const isMobile = window.innerWidth <= 767;
    let gameScale = 1;

    if (isMobile) {
        canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        canvas.height = 1200;
        gameScale = GAME_CONFIG.MOBILE_SCALE_FACTOR;
    } else {
        canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
        gameScale = 1;
    }

    effectManager = new EffectManager(gameScale);

    // --- 遊戲變數 ---
    let gameStarted = false;
    let score = 0;
    let player; 
    let timeLeft = GAME_CONFIG.GAME_TIME;
    let gameTimerId = null;
    let isFeverTime = false;
    let feverMeter = 0;
    let feverDurationTimer = 0;
    let currentLang = 'zh-TW';
    
    let playerProfile = {
        cumulativeScore: 0,
        claimedTier1: false,
        tier2Qualified: false,
        tier3Qualified: false,
        instagramHandle: null
    };
    let currentStats = {};
    let stats_positive = 0, stats_negative = 0, stats_correct = 0, stats_wrong = 0;
    let totalGameTime = 0, stats_feverCount = 0, stats_feverTime = 0;
    let stats_items_positive = 0, stats_items_negative = 0, stats_questions_correct = 0, stats_questions_wrong = 0;
    
    let currentClaimingTier = null;
    let wasMilestoneModalOpen = false;
    let lastGameStats = null;
    let currentUserID = null;

    // --- Helper Functions Definitions (Moved to top of scope) ---
    
    function updateLoadingProgress() {
        const progress = Math.floor((assetsLoaded / assetsToLoad) * 100);
        const hintIndex = Math.min(Math.floor((progress / 100) * loadingHints.length), loadingHints.length - 1);
        const currentHint = loadingHints[hintIndex];

        let estimatedRemainingTime = 0;
        if (assetsLoaded > 0) {
            const elapsedTime = Date.now() - loadingStartTime;
            const averageTimePerAsset = elapsedTime / assetsLoaded;
            const remainingAssets = assetsToLoad - assetsLoaded;
            estimatedRemainingTime = Math.ceil((averageTimePerAsset * remainingAssets) / 1000);
        }

        uiManager.updateLoading(progress, currentHint, estimatedRemainingTime);
    }

    function onAssetLoad() {
        assetsLoaded++;
        updateLoadingProgress();
        if (assetsLoaded === assetsToLoad) {
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

    function handleAuthentication() {
        databaseManager.handleAuthentication(
            (uid) => {
                currentUserID = uid;
                uiManager.showStartScreen();
            },
            (error) => {
                const modalTitle = document.getElementById('modal-title');
                const modalText = document.getElementById('modal-text');
                if (modalTitle) modalTitle.textContent = "登入失敗";
                if (modalText) modalText.textContent = "無法連線至伺服器以驗證您的身份，請檢查網路連線後重新整理頁面。";
                uiManager.showModalOverlay();
            }
        );
    }
    
    function resizeCanvas() {
        const wasMobile = canvas.height > GAME_CONFIG.CANVAS_HEIGHT;
        const isMobileNow = window.innerWidth <= 767;

        if (isMobileNow) {
            canvas.height = 1200;
            gameScale = GAME_CONFIG.MOBILE_SCALE_FACTOR;
        } else {
            canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
            gameScale = 1;
        }

        effectManager.setGameScale(gameScale);
        if (itemManager) itemManager.resize(gameScale, canvas.width, canvas.height);

        if (wasMobile !== isMobileNow && player) {
            player.resize(gameScale, canvas.width, canvas.height);
        }
    }

    function applyLanguage(lang) {
        if (!i18nStrings[lang]) {
            console.warn(`找不到語言 ${lang}，使用 zh-TW。`);
            lang = 'zh-TW';
        }
        currentLang = lang;

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

        if (!gameStarted) {
            uiManager.showStartScreen();
        }
    }

    function detectLanguage() { 
        let browserLang = navigator.language || navigator.userLanguage; 
        if (browserLang.startsWith('en')) { 
            applyLanguage('en'); 
        } else if (browserLang.startsWith('zh')) { 
            applyLanguage('zh-TW'); 
        } else { 
            applyLanguage('zh-TW'); 
        } 
    }

    function shuffleArray(array) { 
        for (let i = array.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; 
        } 
        return array; 
    }

    function clearGameTimers() {
        if (gameTimerId) { clearInterval(gameTimerId); gameTimerId = null; }
    }

    // Copy Share Text
    function copyShareText() {
        const text = `我剛剛在《2026 Happy Yuan Day》應援遊戲中獲得了 ${score} 分！\n快來一起幫小媛寶應援吧！\n#HappyYuanDay #應援遊戲`;
        navigator.clipboard.writeText(text).then(() => {
            alert("分享文字已複製！");
        });
    }

    // --- 資源載入 ---
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

    // 初始化 Player
    player = new Player(gameScale, canvas.width, canvas.height, onAssetLoad, onAssetError);

    // 初始化 ItemManager
    const onItemScore = (item, isFever) => {
        if (item.type === 'question') {
            audioManager.playSound('collectQuestion');
            showQuestion();
            return;
        }

        let points = item.score;
        if (item.type === 'negative') {
            points = -points;
        }

        if (isFever && points > 0) points *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
        score += points;

        uiManager.updateScore(score);
        effectManager.addScoreEffect(item.x, item.y, points, points > 0 ? 'positive' : 'negative');

        if (points > 0) {
            audioManager.playSound(item.type === 'special' ? 'collectSpecial' : 'collectPositive');
            stats_items_positive++;
            player.setHappy();

            if (!isFever) {
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
            player.setSad();

            if (!isFever) {
                const penalty = GAME_CONFIG.FEVER.PENALTY_PER_MISTAKE || 20;
                feverMeter = Math.max(0, feverMeter - penalty);
                uiManager.updateFeverProgress(Math.floor(feverMeter));
            }
        }
    };

    itemManager = new ItemManager(gameScale, canvas.width, canvas.height, GAME_CONFIG, onItemScore);
    itemManager.loadAssets(onAssetLoad, onAssetError);

    // 監聽視窗大小變化
    window.addEventListener('resize', resizeCanvas);

    // --- 遊戲核心函式 (其他需要依賴順序的) ---
    
    function activateFeverTime() {
        if (isFeverTime) return;
        isFeverTime = true;
        feverDurationTimer = GAME_CONFIG.FEVER.DURATION;
        itemManager.setFeverMode(true);

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
        itemManager.setFeverMode(false);

        uiManager.updateFeverProgress(0);

        audioManager.pauseBGM('bgmFever');
        audioManager.audio.bgmFever.currentTime = 0;
        audioManager.playBGM('bgm');

        effectManager.deactivateFeverVisuals();
    }

    async function endGame() {
        gameStarted = false;
        inputManager.setActive(false);
        clearGameTimers();
        audioManager.stopBGM('bgm');
        audioManager.stopBGM('bgmFever');
        audioManager.playSound('gameOver');

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

        if (isFeverTime) {
            effectManager.deactivateFeverVisuals();
        }
        isFeverTime = false;
        feverMeter = 0;
        feverDurationTimer = 0;
        uiManager.updateFeverProgress(0);

        const shareStats = {
            score: score,
            itemsCaught: stats_items_positive + stats_items_negative,
            correctAnswers: stats_questions_correct,
            wrongAnswers: stats_questions_wrong
        };
        lastGameStats = shareStats;

        const endgameTitle = document.getElementById('endgame-title');
        endgameTitle.textContent = i18nStrings[currentLang].modalEndTitle;

        uiManager.hideAllModalScreens();
        const endgameScreenUI = document.getElementById('endgame-screen-ui');
        endgameScreenUI.classList.remove('hidden');
        uiManager.showModalOverlay();

        shareManager.generateScoreCard(shareStats, 'square').then(() => {
            const shareSection = document.getElementById('share-section');
            if (shareSection) shareSection.style.display = 'block';
        }).catch(err => console.warn("Share card generation failed:", err));

        if (currentUserID) {
            databaseManager.saveScore(currentUserID, currentStats).catch(err => {
                console.warn("Score upload failed:", err);
            });
        }
    }

    function resetGame() {
        score = 0;
        timeLeft = GAME_CONFIG.GAME_TIME;
        feverMeter = 0;
        isFeverTime = false;
        itemManager.reset();
        
        // Reset Stats
        stats_positive = 0; stats_negative = 0; stats_correct = 0; stats_wrong = 0;
        totalGameTime = 0; stats_feverCount = 0; stats_feverTime = 0;
        stats_items_positive = 0; stats_items_negative = 0; stats_questions_correct = 0; stats_questions_wrong = 0;

        uiManager.updateScore(score);
        uiManager.updateTime(timeLeft);
        uiManager.updateFeverProgress(0);
        
        effectManager.resetScoreEffects();
        effectManager.deactivateFeverVisuals();

        player.reset();
    }

    let lastTime = 0;
    const FPS_LIMIT = 60;
    const FRAME_INTERVAL = 1000 / FPS_LIMIT;

    function updateTimer() {
        timeLeft--;
        uiManager.updateTime(timeLeft);
        if (timeLeft <= 0) {
            endGame();
        }
    }

    function gameLoop(timestamp) {
        if (!gameStarted) return;

        if (!timestamp) timestamp = performance.now();
        const deltaTime = timestamp - lastTime;

        if (deltaTime < FRAME_INTERVAL) {
            requestAnimationFrame(gameLoop);
            return;
        }

        lastTime = timestamp - (deltaTime % FRAME_INTERVAL);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        player.update(inputManager);
        player.draw(ctx);

        if (isFeverTime) {
            feverDurationTimer--;
            stats_feverTime++;
            
            const percent = Math.max(0, Math.floor((feverDurationTimer / GAME_CONFIG.FEVER.DURATION) * 100));
            uiManager.updateFeverProgress(percent);

            if (feverDurationTimer <= 0) {
                endFeverTime();
            }
        }

        itemManager.update(player, isFeverTime);
        itemManager.draw(ctx);

        effectManager.updateAndDrawScoreEffects(ctx);

        requestAnimationFrame(gameLoop);
    }

    function resumeGame() {
        const answerButtons = document.querySelectorAll('.answer-option');
        answerButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('correct-answer', 'incorrect-answer');
        });

        uiManager.hideAllModalScreens();
        uiManager.hideModalOverlay();

        gameStarted = true;
        inputManager.setActive(true);
        clearGameTimers();
        gameTimerId = setInterval(updateTimer, 1000);

        if (audioManager.isMuted) return;
        if (isFeverTime) {
            audioManager.playBGM('bgmFever');
        } else {
            audioManager.playBGM('bgm');
        }

        lastTime = performance.now();
        gameLoop(lastTime);
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

    function showQuestion() {
        gameStarted = false;
        inputManager.setActive(false);
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

        const correctIndex = options.indexOf(qData.correctAnswer);
        uiManager.setupQuestion(qData.question, options, correctIndex);

        const answerButtons = document.querySelectorAll('.answer-option');
        answerButtons.forEach(btn => {
            btn.onclick = handleAnswer;
        });
    }

    function startGame() {
        resetGame();
        uiManager.hideAllModalScreens();
        uiManager.hideModalOverlay();

        gameStarted = true;
        inputManager.setActive(true);
        audioManager.playSound('gameStart');
        audioManager.playBGM('bgm');

        gameTimerId = setInterval(updateTimer, 1000);
        lastTime = performance.now();
        gameLoop(lastTime);
    }

    // ========================================================================
    // --- ✨ 彈窗與UI互動邏輯 ✨ ---
    // ========================================================================

    function showIgPrompt(tier) {
        currentClaimingTier = tier;
        databaseManager.currentClaimingTier = tier;

        const milestoneModal = document.getElementById('milestone-modal-overlay');
        wasMilestoneModalOpen = !milestoneModal.classList.contains('hidden');
        if (wasMilestoneModalOpen) {
            milestoneModal.classList.add('hidden');
        }

        uiManager.showIgPrompt(playerProfile.instagramHandle);
    }

    function hideIgPrompt() {
        const igPromptArea = document.getElementById('ig-prompt-area');
        igPromptArea.classList.add('hidden');

        if (wasMilestoneModalOpen) {
            wasMilestoneModalOpen = false;
            showMilestoneModal(false);
            uiManager.showModalOverlay();
        } else {
            uiManager.showStartScreen();
        }
    }

    async function showMilestoneModal(isEndGameFlow = false) {
        await databaseManager.loadPlayerProfile();
        playerProfile = databaseManager.playerProfile;

        const currentScore = playerProfile.cumulativeScore;
        const milestoneCurrentScore = document.getElementById('milestone-current-score');
        milestoneCurrentScore.textContent = new Intl.NumberFormat().format(currentScore);

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
        uiManager.hideModalOverlay(); 
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

    // --- 初始化呼叫 ---
    detectLanguage();
    handleAuthentication();

    // --- 事件綁定 ---
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const settingsMainView = document.getElementById('settings-main-view');
    const settingsLanguageView = document.getElementById('settings-language-view');
    const settingsTroubleshootView = document.getElementById('settings-troubleshoot-view');
    const btnLanguageSettings = document.getElementById('btn-language-settings');
    const btnTroubleshoot = document.getElementById('btn-troubleshoot');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnBackSettingsLang = document.getElementById('btn-back-settings-lang');
    const btnBackSettingsTrouble = document.getElementById('btn-back-settings-trouble');
    const btnRepairGame = document.getElementById('btn-repair-game');
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

    if (btnTroubleshoot) {
        btnTroubleshoot.addEventListener('click', () => {
            settingsMainView.classList.add('hidden');
            if (settingsTroubleshootView) settingsTroubleshootView.classList.remove('hidden');
        });
    }

    const btnBackSettings = document.getElementById('btn-back-settings');
    const actualBackLangBtn = btnBackSettingsLang || btnBackSettings;
    
    if (actualBackLangBtn) {
        actualBackLangBtn.addEventListener('click', () => {
            settingsLanguageView.classList.add('hidden');
            settingsMainView.classList.remove('hidden');
        });
    }

    if (btnBackSettingsTrouble) {
        btnBackSettingsTrouble.addEventListener('click', () => {
            if (settingsTroubleshootView) settingsTroubleshootView.classList.add('hidden');
            settingsMainView.classList.remove('hidden');
        });
    }

    if (btnRepairGame) {
        btnRepairGame.addEventListener('click', () => {
            const confirmText = currentLang === 'zh-TW' ? 
                "這將會清除遊戲的暫存資料並重新載入，您的累積紀錄（若已登入）不會消失。確定要執行嗎？" : 
                "This will clear game cache and reload. Your saved progress (if logged in) will remain. Continue?";
            
            if (confirm(confirmText)) {
                const savedUUID = localStorage.getItem(GAME_CONFIG.USER_ID_KEY);
                localStorage.clear();
                if (savedUUID) {
                    localStorage.setItem(GAME_CONFIG.USER_ID_KEY, savedUUID);
                }
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

    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            applyLanguage(e.target.value);
        });
    }

    // 按鈕事件
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', startGame);

    const openMilestoneButton = document.getElementById('open-milestone-button');
    openMilestoneButton.addEventListener('click', () => showMilestoneModal(false));

    const openGlobalMilestoneButton = document.getElementById('open-global-milestone-button');
    openGlobalMilestoneButton.addEventListener('click', () => showGlobalMilestoneModal(false));

    const milestoneIgEditButton = document.getElementById('milestone-ig-edit-button');
    milestoneIgEditButton.addEventListener('click', () => showIgPrompt(null));

    const igCancelButton = document.getElementById('ig-cancel-button');
    igCancelButton.addEventListener('click', hideIgPrompt);

    const igSubmitButton = document.getElementById('ig-submit-button');
    igSubmitButton.addEventListener('click', async () => {
        const input = document.getElementById('ig-input');
        const handle = input.value.trim();
        if (handle) {
            await databaseManager.saveInstagramHandle(handle);
            playerProfile.instagramHandle = handle;
            // if (currentClaimingTier) { ... } // DatabaseManager logic should handle claim if we called claimTier before, but here we just save handle.
            // The tier claiming button logic calls databaseManager.claimTier
            hideIgPrompt();
        }
    });

    const claimTier1Button = document.getElementById('claim-tier1-button');
    claimTier1Button.addEventListener('click', () => {
        window.open(GAME_CONFIG.MILESTONES.REWARDS.TIER_1_URL, '_blank');
        databaseManager.claimTier(1);
        playerProfile.claimedTier1 = true;
        showMilestoneModal(false);
    });

    const claimTier2Button = document.getElementById('claim-tier2-button');
    claimTier2Button.addEventListener('click', () => showIgPrompt(2));

    const claimTier3Button = document.getElementById('claim-tier3-button');
    claimTier3Button.addEventListener('click', () => showIgPrompt(3));

    const endgameContinueButton = document.getElementById('endgame-continue-button');
    endgameContinueButton.addEventListener('click', showPersonalMilestoneStep);

    const birthdayCloseButton = document.getElementById('birthday-close-button');
    birthdayCloseButton.addEventListener('click', () => {
        const birthdayModal = document.getElementById('birthday-modal-overlay');
        birthdayModal.classList.add('hidden');
        uiManager.hideModalOverlay();
        audioManager.audio.birthday.pause();
        audioManager.audio.birthday.currentTime = 0;
        uiManager.showStartScreen();
    });

    const formatSquareBtn = document.getElementById('formatSquareBtn');
    if (formatSquareBtn) {
        formatSquareBtn.addEventListener('click', () => {
            if (lastGameStats) {
                shareManager.switchShareFormat('square', lastGameStats, currentLang, i18nStrings);
            }
        });
    }

    const formatStoryBtn = document.getElementById('formatStoryBtn');
    if (formatStoryBtn) {
        formatStoryBtn.addEventListener('click', () => {
            if (lastGameStats) {
                shareManager.switchShareFormat('story', lastGameStats, currentLang, i18nStrings);
            }
        });
    }

    const downloadScoreBtn = document.getElementById('downloadScoreBtn');
    if (downloadScoreBtn) {
        downloadScoreBtn.addEventListener('click', () => {
            const canvas = document.getElementById('scoreCardCanvas');
            if (canvas) {
                shareManager.downloadImage(canvas.toDataURL('image/png'));
            }
        });
    }

    const shareScoreBtn = document.getElementById('shareScoreBtn');
    if (shareScoreBtn) {
        shareScoreBtn.addEventListener('click', () => {
            const canvas = document.getElementById('scoreCardCanvas');
            if (canvas && lastGameStats) {
                shareManager.shareImage(canvas.toDataURL('image/png'), lastGameStats);
            }
        });
    }

    const globalMilestoneRestartButton = document.getElementById('global-milestone-restart-button');
    const globalMilestoneShareButton = document.getElementById('global-milestone-share-button');
    const globalMilestoneCloseButton = document.getElementById('global-milestone-close-button');
    const milestoneCloseButton = document.getElementById('milestone-close-button');
});