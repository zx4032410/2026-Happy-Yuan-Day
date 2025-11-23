class AudioManager {
    constructor() {
        this.audio = {};
        this.isMuted = false;
        this.initAudio();
        this.setupMuteButton();
    }

    initAudio() {
        // BGM
        this.audio.bgm = new Audio('./audio/bgm.mp3');
        this.audio.bgm.loop = true;
        this.audio.bgm.volume = 0.5;

        this.audio.bgmFever = new Audio('./audio/bgm-fever.m4a'); // ✨ 修正副檔名
        this.audio.bgmFever.loop = true;
        this.audio.bgmFever.volume = 0.5;

        this.audio.birthday = new Audio('./audio/Happy Birthday_8bit.mp3'); // ✨ 修正檔名
        this.audio.birthday.loop = true;
        this.audio.birthday.volume = 0.6;

        // SFX Pools
        this.audio.gameStart = new AudioPool('./audio/game-start.mp3', 1);
        this.audio.answerCorrect = new AudioPool('./audio/answer-correct.mp3', 3); // ✨ 修正檔名
        this.audio.answerIncorrect = new AudioPool('./audio/answer-incorrect.mp3', 3); // ✨ 修正檔名
        this.audio.collectPositive = new AudioPool('./audio/collect-positive.mp3', 5); // ✨ 修正檔名
        this.audio.collectNegative = new AudioPool('./audio/collect-negative.mp3', 5); // ✨ 修正檔名
        this.audio.collectSpecial = new AudioPool('./audio/collect-special.mp3', 3); // ✨ 修正檔名
        this.audio.collectQuestion = new AudioPool('./audio/collect-question.mp3', 2); // ✨ 修正檔名
        this.audio.gameOver = new AudioPool('./audio/game-over.mp3', 1);
    }

    setupMuteButton() {
        const muteButton = document.getElementById('mute-button');
        if (muteButton) {
            muteButton.addEventListener('click', () => this.toggleMute());
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        // Update BGM
        Object.values(this.audio).forEach(audio => {
            if (audio instanceof Audio) {
                audio.muted = this.isMuted;
            } else if (audio instanceof AudioPool) {
                audio.pool.forEach(a => a.muted = this.isMuted);
            }
        });

        // Update UI (if uiManager is available globally or passed in, otherwise handle locally or let game.js handle UI update via callback)
        // For now, we'll update the button directly as a fallback or rely on game.js to update UI
        const muteButton = document.getElementById('mute-button');
        if (muteButton) {
            muteButton.textContent = this.isMuted ? '🔇' : '🔊';
            muteButton.classList.toggle('muted', this.isMuted);
        }
    }

    playSound(name, allowOverlap = true) {
        if (this.isMuted) return;
        if (this.audio[name]) {
            if (this.audio[name] instanceof AudioPool) {
                this.audio[name].play();
            } else {
                const sound = this.audio[name];
                sound.currentTime = 0;
                sound.play().catch(e => console.warn(`Audio ${name} play failed:`, e));
            }
        }
    }

    playBGM(name) {
        if (this.isMuted) return;
        if (this.audio[name]) {
            this.audio[name].play().catch(e => console.warn(`BGM ${name} play failed:`, e));
        }
    }

    pauseBGM(name) {
        if (this.audio[name]) {
            this.audio[name].pause();
        }
    }

    stopBGM(name) {
        if (this.audio[name]) {
            this.audio[name].pause();
            this.audio[name].currentTime = 0;
        }
    }
}

class AudioPool {
    constructor(src, size = 5) {
        this.pool = [];
        this.index = 0;
        for (let i = 0; i < size; i++) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            this.pool.push(audio);
        }
    }

    play() {
        const audio = this.pool[this.index];
        audio.currentTime = 0;
        audio.play().catch(e => console.warn('Audio play failed:', e));
        this.index = (this.index + 1) % this.pool.length;
    }
}
