import { GAME_CONFIG } from './game-config.js';
import { i18nStrings } from './lang.js';
import { QUESTION_BANK } from './questions.js';
import AudioManager from './managers/audio-manager.js';
import DatabaseManager from './managers/database-manager.js';
import EffectManager from './managers/effect-manager.js';
import InputManager from './managers/input-manager.js';
import ItemManager from './managers/item-manager.js';
import ShareManager from './managers/share-manager.js';
import UIManager from './managers/ui-manager.js';
import Player from './player.js';
import OfflineManager from './offline-handler.js';
import ScoreManager from './managers/score-manager.js';
import GameStateManager from './managers/game-state-manager.js';

// ✨ Compatibility: Expose i18nStrings globally if needed for other legacy scripts
window.i18nStrings = i18nStrings;

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
    // ... (Error listeners)

    // --- 初始化 Managers ---
    const databaseManager = new DatabaseManager();
    const shareManager = new ShareManager();
    const audioManager = new AudioManager();
    const uiManager = new UIManager();
    const inputManager = new InputManager();
    const offlineManager = new OfflineManager(databaseManager);
    const scoreManager = new ScoreManager();
    const gameStateManager = new GameStateManager({
        onTimeUp: () => endGame(),
        onTimeUpdate: (time) => uiManager.updateTime(time)
    });
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
    let player; 
    // let timeLeft = GAME_CONFIG.GAME_TIME; // Managed by GameStateManager
    // let gameTimerId = null; // Managed by GameStateManager
    // let gameStarted = false; // Managed by GameStateManager
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
        window.currentLang = lang;

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

        if (!gameStateManager.isPlaying()) {
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

    // Copy Share Text
    function copyShareText() {
        const score = scoreManager.getScore();
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

        const result = scoreManager.handleItemScore(item);
        
        uiManager.updateScore(result.score);
        effectManager.addScoreEffect(item.x, item.y, result.points, result.points > 0 ? 'positive' : 'negative');

        if (result.points > 0) {
            audioManager.playSound(item.type === 'special' ? 'collectSpecial' : 'collectPositive');
            player.setHappy();

            if (!scoreManager.isFeverTime) {
                if (result.shouldActivateFever) {
                    activateFeverTime();
                }
                uiManager.updateFeverProgress(Math.floor(result.feverMeter));
            }
        } else {
            audioManager.playSound('collectNegative');
            player.setSad();

            if (!scoreManager.isFeverTime) {
                uiManager.updateFeverProgress(Math.floor(result.feverMeter));
            }
        }
    };

    itemManager = new ItemManager(gameScale, canvas.width, canvas.height, GAME_CONFIG, onItemScore);
    itemManager.loadAssets(onAssetLoad, onAssetError);

    // 監聽視窗大小變化
    window.addEventListener('resize', resizeCanvas);

    // --- 遊戲核心函式 (其他需要依賴順序的) ---
    
    function activateFeverTime() {
        if (scoreManager.isFeverTime) return;
        scoreManager.activateFever();
        itemManager.setFeverMode(true);

        uiManager.updateFeverProgress(100);

        // ✨ 效能優化：延遲音效切換和視覺效果，避免觸發瞬間卡頓
        requestAnimationFrame(() => {
            audioManager.pauseBGM('bgm');
            audioManager.audio.bgm.currentTime = 0;
            audioManager.audio.bgmFever.loop = true;
            audioManager.playBGM('bgmFever');
            effectManager.activateFeverVisuals();
        });
    }

    function endFeverTime() {
        if (!scoreManager.isFeverTime) return;
        scoreManager.deactivateFever();
        itemManager.setFeverMode(false);

        uiManager.updateFeverProgress(0);

        audioManager.pauseBGM('bgmFever');
        audioManager.audio.bgmFever.currentTime = 0;
        audioManager.playBGM('bgm');

        effectManager.deactivateFeverVisuals();
    }

    async function endGame() {
        gameStateManager.stopGame();
        inputManager.setActive(false);
        // clearGameTimers(); // No longer needed
        audioManager.stopBGM('bgm');
        audioManager.stopBGM('bgmFever');
        audioManager.playSound('gameOver');

        const score = scoreManager.getScore();
        const stats = scoreManager.getStats();
        currentStats = {
            ...stats,
            timestamp: new Date()
        };

        if (scoreManager.isFeverTime) {
            effectManager.deactivateFeverVisuals();
        }
        scoreManager.deactivateFever();
        uiManager.updateFeverProgress(0);

        const shareStats = {
            score: score,
            itemsCaught: stats.itemsPositive + stats.itemsNegative,
            correctAnswers: stats.questionsCorrect,
            wrongAnswers: stats.questionsWrong
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
            if (navigator.onLine) {
                databaseManager.saveScore(currentUserID, currentStats).catch(err => {
                    console.warn("Score upload failed, attempting offline save:", err);
                    offlineManager.saveScoreOffline({
                        userId: currentUserID,
                        ...currentStats
                    });
                });
            } else {
                offlineManager.saveScoreOffline({
                    userId: currentUserID,
                    ...currentStats
                });
            }
        }
    }

    function resetGame() {
        scoreManager.reset();
        // timeLeft = GAME_CONFIG.GAME_TIME; // Reset in startGame
        itemManager.reset();
        
        uiManager.updateScore(0);
        uiManager.updateTime(GAME_CONFIG.GAME_TIME);
        uiManager.updateFeverProgress(0);
        
        effectManager.resetScoreEffects();
        effectManager.deactivateFeverVisuals();

        player.reset();
    }

    let lastTime = 0;
    const FPS_LIMIT = 60;
    const FRAME_INTERVAL = 1000 / FPS_LIMIT;

    function gameLoop(timestamp) {
        if (!gameStateManager.isPlaying()) return;

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

        if (scoreManager.isFeverTime) {
            const percent = scoreManager.updateFeverTimer();
            if (percent !== null) {
                uiManager.updateFeverProgress(percent);
                if (percent === 0) {
                    endFeverTime();
                }
            }
        }

        itemManager.update(player, scoreManager.isFeverTime);
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

        gameStateManager.resumeGame();
        inputManager.setActive(true);
        // clearGameTimers(); // Not needed
        // gameTimerId = setInterval(updateTimer, 1000); // Handled by resumeGame

        if (audioManager.isMuted) return;
        if (scoreManager.isFeverTime) {
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

        const result = scoreManager.handleQuestionScore(isCorrect);

        if (isCorrect) {
            player.setHappy();
            audioManager.playSound('answerCorrect');
        } else {
            player.setSad();
            audioManager.playSound('answerIncorrect');
        }

        uiManager.updateScore(result.score);

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
        gameStateManager.pauseGame();
        inputManager.setActive(false);
        // clearGameTimers(); // Handled by pauseGame
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

        gameStateManager.startGame();
        inputManager.setActive(true);
        audioManager.playSound('gameStart');
        audioManager.playBGM('bgm');

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
    const tutorialModal = document.getElementById('tutorial-modal-overlay');
    const tutorialCloseButton = document.getElementById('tutorial-close-button');
    const tutorialDontShowCheckbox = document.getElementById('tutorial-dont-show');

    // ✨ 修改：點擊開始按鈕時，先檢查是否需要顯示遊戲說明
    startButton.addEventListener('click', () => {
        const tutorialDismissed = localStorage.getItem(GAME_CONFIG.TUTORIAL_DISMISSED_KEY);
        if (tutorialDismissed === 'true') {
            // 已勾選過「不再顯示」，直接開始遊戲
            startGame();
        } else {
            // 顯示遊戲說明彈窗
            uiManager.hideAllModalScreens();
            tutorialModal.classList.remove('hidden');
        }
    });

    // ✨ 新增：遊戲說明彈窗關閉事件
    if (tutorialCloseButton) {
        tutorialCloseButton.addEventListener('click', () => {
            // 檢查是否勾選「不再顯示」
            if (tutorialDontShowCheckbox && tutorialDontShowCheckbox.checked) {
                localStorage.setItem(GAME_CONFIG.TUTORIAL_DISMISSED_KEY, 'true');
            }
            // 關閉說明彈窗並開始遊戲
            tutorialModal.classList.add('hidden');
            startGame();
        });
    }

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

    // ========================================================================
    // --- 🎂 生日祝福相關邏輯 🎂 ---
    // ========================================================================

    // 🎂 判斷祝福活動是否已結束（2026/1/6 00:00 之後）
    function isWishingPeriodEnded() {
        const endDate = new Date('2026-01-06T00:00:00+08:00'); // 台灣時區
        return new Date() >= endDate;
    }

    const openWishButton = document.getElementById('open-wish-button');
    const wishModalOverlay = document.getElementById('wish-modal-overlay');
    const wishNicknameInput = document.getElementById('wish-nickname-input');
    const wishMessageInput = document.getElementById('wish-message-input');
    const wishCharCount = document.getElementById('wish-char-count');
    const wishCancelButton = document.getElementById('wish-cancel-button');
    const wishSubmitButton = document.getElementById('wish-submit-button');

    // 🎂 初始化祝福按鈕狀態（根據日期決定文字和行為）
    function initWishButton() {
        if (!openWishButton) return;
        
        if (isWishingPeriodEnded()) {
            // 生日結束後：顯示「檢視祝福」
            openWishButton.textContent = i18nStrings[currentLang].viewWishesButton;
        } else {
            // 活動期間：顯示「獻上祝福」
            openWishButton.textContent = i18nStrings[currentLang].wishButton;
        }
    }

    // 更新字數統計
    if (wishMessageInput && wishCharCount) {
        wishMessageInput.addEventListener('input', () => {
            const current = wishMessageInput.value.length;
            const max = wishMessageInput.maxLength;
            wishCharCount.textContent = `${current} / ${max}`;
        });
    }

    // 開啟祝福輸入彈窗
    async function openWishModal() {
        // 檢查用戶是否已提交過祝福
        const existingWish = await databaseManager.checkUserWish();
        
        if (existingWish) {
            // 已有祝福，預填內容讓用戶修改
            wishNicknameInput.value = existingWish.nickname || '';
            wishMessageInput.value = existingWish.message || '';
        } else {
            wishNicknameInput.value = '';
            wishMessageInput.value = '';
        }

        // 更新字數統計
        const current = wishMessageInput.value.length;
        const max = wishMessageInput.maxLength;
        wishCharCount.textContent = `${current} / ${max}`;
        
        wishModalOverlay.classList.remove('hidden');
    }

    // 關閉祝福輸入彈窗
    function closeWishModal() {
        wishModalOverlay.classList.add('hidden');
    }

    // 提交祝福
    async function submitWish() {
        const nickname = wishNicknameInput.value.trim();
        const message = wishMessageInput.value.trim();

        // 驗證暱稱（必填）
        if (!nickname) {
            alert(i18nStrings[currentLang].wishNicknameRequired);
            wishNicknameInput.focus();
            return;
        }

        // 驗證訊息（必填）
        if (!message) {
            alert(i18nStrings[currentLang].wishMessageRequired);
            wishMessageInput.focus();
            return;
        }

        // 禁用按鈕防止重複提交
        wishSubmitButton.disabled = true;
        wishSubmitButton.textContent = '...';

        try {
            const existingWish = await databaseManager.checkUserWish();
            const success = await databaseManager.submitWish(nickname, message);
            
            if (success) {
                alert(existingWish ? 
                    i18nStrings[currentLang].wishUpdateSuccess : 
                    i18nStrings[currentLang].wishSubmitSuccess
                );
                closeWishModal();
            } else {
                alert('提交失敗，請稍後再試');
            }
        } catch (error) {
            console.error('提交祝福失敗:', error);
            alert('提交失敗，請稍後再試');
        } finally {
            wishSubmitButton.disabled = false;
            wishSubmitButton.textContent = i18nStrings[currentLang].wishSubmitButton;
        }
    }

    // 事件綁定
    if (openWishButton) {
        openWishButton.addEventListener('click', () => {
            if (isWishingPeriodEnded()) {
                // 生日結束後：導向祝福牆
                window.location.href = 'wishes.html';
            } else {
                // 活動期間：打開祝福輸入彈窗
                openWishModal();
            }
        });
        
        // 初始化按鈕狀態
        initWishButton();
    }

    if (wishCancelButton) {
        wishCancelButton.addEventListener('click', closeWishModal);
    }

    if (wishSubmitButton) {
        wishSubmitButton.addEventListener('click', submitWish);
    }

    // --- 生日視窗浮動祝福動畫 ---
    let wishAnimationInterval = null;

    async function startBirthdayWishesAnimation() {
        const backdrop = document.getElementById('birthday-wishes-backdrop');
        if (!backdrop) return;

        // 清空現有祝福
        backdrop.innerHTML = '';

        // 取得祝福列表
        const wishes = await databaseManager.getWishes(100);
        if (wishes.length === 0) return;

        // 創建多排跑馬燈
        const rowCount = 4; // 4 排
        const rowHeight = window.innerHeight / (rowCount + 1);
        
        for (let row = 0; row < rowCount; row++) {
            const marqueeRow = document.createElement('div');
            marqueeRow.className = 'wish-marquee-row';
            marqueeRow.style.top = `${(row + 0.5) * rowHeight}px`;
            
            // 調整速度讓每排不一樣
            const speed = 25 + (row * 7); // 25s, 32s, 39s, 46s（減慢速度讓祝福更容易閱讀）
            marqueeRow.style.animationDuration = `${speed}s`;
            
            // 將祝福分配到這一排（重複顯示以形成無縫滾動）
            const wishesForRow = [];
            for (let i = 0; i < 2; i++) { // 重複兩次形成無縫
                wishes.forEach((wish, idx) => {
                    if ((idx % rowCount) === row) {
                        wishesForRow.push(wish);
                    }
                });
            }
            
            // 創建祝福元素
            wishesForRow.forEach((wish) => {
                const div = document.createElement('div');
                div.className = 'floating-wish';
                div.textContent = `${wish.nickname}: ${wish.message}`;
                marqueeRow.appendChild(div);
            });
            
            // 如果這排有內容才加入
            if (wishesForRow.length > 0) {
                backdrop.appendChild(marqueeRow);
            }
        }
    }

    function stopBirthdayWishesAnimation() {
        if (wishAnimationInterval) {
            clearInterval(wishAnimationInterval);
            wishAnimationInterval = null;
        }
        const backdrop = document.getElementById('birthday-wishes-backdrop');
        if (backdrop) {
            backdrop.innerHTML = '';
        }
    }

    // 修改 closeSettlementAndCheckBirthday 中的生日視窗開啟邏輯
    const originalCloseSettlement = closeSettlementAndCheckBirthday;
    closeSettlementAndCheckBirthday = function() {
        const globalMilestoneModal = document.getElementById('global-milestone-modal-overlay');
        globalMilestoneModal.classList.add('hidden');
        uiManager.hideModalOverlay();

        if (isBirthdayToday()) {
            const birthdayModal = document.getElementById('birthday-modal-overlay');
            birthdayModal.classList.remove('hidden');
            uiManager.showModalOverlay();
            audioManager.audio.birthday.play().catch(e => console.log("Birthday song autoplay blocked"));
            
            // 🎂 啟動祝福浮動動畫
            startBirthdayWishesAnimation();
        } else {
            uiManager.showStartScreen();
        }
    };

    // 更新生日視窗關閉事件，停止動畫
    const originalBirthdayClose = birthdayCloseButton.onclick;
    birthdayCloseButton.onclick = null;
    birthdayCloseButton.addEventListener('click', () => {
        const birthdayModal = document.getElementById('birthday-modal-overlay');
        birthdayModal.classList.add('hidden');
        uiManager.hideModalOverlay();
        audioManager.audio.birthday.pause();
        audioManager.audio.birthday.currentTime = 0;
        
        // 🎂 停止祝福浮動動畫
        stopBirthdayWishesAnimation();
        
        uiManager.showStartScreen();
    });

});