class UIManager {
    constructor() {
        this.cacheElements();
    }

    cacheElements() {
        // Screens
        this.screens = {
            start: document.getElementById('start-screen-ui'),
            endgame: document.getElementById('endgame-screen-ui'),
            question: document.getElementById('question-area'),
            igPrompt: document.getElementById('ig-prompt-area'),
            loading: document.getElementById('loading-overlay'),
            modalOverlay: document.getElementById('modal-overlay'),
            modalContent: document.getElementById('modal-content'),
            milestoneModal: document.getElementById('milestone-modal-overlay'),
            globalMilestoneModal: document.getElementById('global-milestone-modal-overlay'),
            birthdayModal: document.getElementById('birthday-modal-overlay')
        };

        // HUD
        this.hud = {
            score: document.getElementById('score-display'),
            time: document.getElementById('time-display'),
            fever: document.getElementById('milestone-progress'), // Using milestone-progress as fever label based on original code
            feverBar: document.getElementById('fever-timer-bar'), // ✨ 新增：Fever Time 倒數計時條
            muteBtn: document.getElementById('mute-button'),
            langSelect: document.getElementById('lang-select')
        };

        // Loading
        this.loading = {
            bar: document.getElementById('loading-progress-bar'),
            text: document.getElementById('loading-text'),
            hint: document.getElementById('loading-hint'),
            time: document.getElementById('loading-time'),
            skeleton: document.getElementById('skeleton-layer')
        };

        // Endgame Stats
        this.endgame = {
            title: document.getElementById('endgame-title'),
            scoreText: document.getElementById('endgame-score-text'),
            continueBtn: document.getElementById('endgame-continue-button')
        };

        // Question
        this.question = {
            text: document.getElementById('question-text'),
            buttons: document.querySelectorAll('.answer-option')
        };

        // IG Input
        this.ig = {
            input: document.getElementById('ig-input')
        };
    }

    // --- Screen Management ---
    hideAllModalScreens() {
        this.screens.start.classList.add('hidden');
        this.screens.endgame.classList.add('hidden');
        this.screens.question.classList.add('hidden');
        this.screens.igPrompt.classList.add('hidden');
    }

    showStartScreen() {
        this.hideAllModalScreens();
        this.screens.start.classList.remove('hidden');
        this.screens.modalOverlay.classList.remove('hidden');
    }

    showModalOverlay() {
        this.screens.modalOverlay.classList.remove('hidden');
    }

    hideModalOverlay() {
        this.screens.modalOverlay.classList.add('hidden');
    }

    // --- HUD Updates ---
    updateScore(score) {
        if (this.hud.score) this.hud.score.textContent = score;
    }

    updateTime(timeLeft) {
        if (this.hud.time) this.hud.time.textContent = `${timeLeft}s`;
    }

    updateFeverProgress(percent) {
        if (this.hud.fever) this.hud.fever.textContent = `${percent}%`;
        if (this.hud.feverBar) this.hud.feverBar.style.width = `${percent}%`;
    }

    updateMuteButton(isMuted) {
        if (this.hud.muteBtn) {
            this.hud.muteBtn.textContent = isMuted ? '🔇' : '🔊';
            this.hud.muteBtn.classList.toggle('muted', isMuted);
        }
    }

    // --- Loading Screen ---
    updateLoading(progress, hint, estimatedTime) {
        if (this.loading.bar) this.loading.bar.style.width = `${progress}%`;
        if (this.loading.text) this.loading.text.textContent = `${progress}%`;
        if (this.loading.hint && hint) this.loading.hint.textContent = hint;

        if (this.loading.time) {
            if (estimatedTime <= 0) {
                this.loading.time.textContent = "即將完成...";
            } else {
                this.loading.time.textContent = `預估剩餘時間: ${estimatedTime} 秒`;
            }
        }
    }

    hideLoading() {
        if (this.loading.skeleton) this.loading.skeleton.classList.add('hidden');
        this.screens.loading.style.opacity = '0';
        setTimeout(() => {
            this.screens.loading.classList.add('hidden');
        }, 500); // Assuming 500ms fade out
    }

    // --- Question UI ---
    setupQuestion(questionText, options, correctIndex) {
        this.hideAllModalScreens();
        this.screens.question.classList.remove('hidden');
        this.screens.modalOverlay.classList.remove('hidden');

        if (this.question.text) this.question.text.textContent = questionText;

        this.question.buttons.forEach((button, index) => {
            button.textContent = options[index];
            button.dataset.correct = (options[index] === options[correctIndex]) ? "true" : "false"; // Logic needs to be passed in or handled carefully
            button.disabled = false;
            button.classList.remove('correct-answer', 'incorrect-answer');
        });
    }

    // --- IG Prompt ---
    showIgPrompt(prefilledValue) {
        this.hideAllModalScreens();

        // Set attributes to prevent extensions interference
        const input = this.ig.input;
        if (input) {
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('data-lpignore', 'true');
            input.setAttribute('name', 'ig-handle-input');
            input.value = prefilledValue || '';
        }

        this.screens.igPrompt.classList.remove('hidden');
        this.screens.modalOverlay.classList.remove('hidden');

        setTimeout(() => {
            if (input) input.focus();
        }, 100);
    }
}
