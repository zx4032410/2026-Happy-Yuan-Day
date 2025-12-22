// js/managers/game-state-manager.js
import { GAME_CONFIG } from '../game-config.js';

export const GameState = {
    STOPPED: 'STOPPED',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
};

export default class GameStateManager {
    constructor(callbacks = {}) {
        this.state = GameState.STOPPED;
        this.timeLeft = GAME_CONFIG.GAME_TIME;
        this.timerId = null;
        
        // Callbacks
        this.onTimeUp = callbacks.onTimeUp || (() => {});
        this.onTimeUpdate = callbacks.onTimeUpdate || (() => {});
    }

    startGame() {
        this.state = GameState.PLAYING;
        this.timeLeft = GAME_CONFIG.GAME_TIME;
        this.startTimer();
    }

    stopGame() {
        this.state = GameState.STOPPED;
        this.stopTimer();
    }

    pauseGame() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            this.stopTimer();
        }
    }

    resumeGame() {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.startTimer();
        }
    }

    startTimer() {
        this.stopTimer(); // Ensure no duplicate timers
        this.timerId = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    updateTimer() {
        if (this.timeLeft > 0) {
            this.timeLeft--;
            this.onTimeUpdate(this.timeLeft);
        }

        if (this.timeLeft <= 0) {
            this.stopGame();
            this.onTimeUp();
        }
    }

    getTimeLeft() {
        return this.timeLeft;
    }

    isPlaying() {
        return this.state === GameState.PLAYING;
    }

    isPaused() {
        return this.state === GameState.PAUSED;
    }
}
