// js/managers/score-manager.js
import { GAME_CONFIG } from '../game-config.js';

export default class ScoreManager {
    constructor() {
        this.score = 0;
        this.feverMeter = 0;
        this.isFeverTime = false;
        this.feverDurationTimer = 0;
        
        // Stats
        this.stats = {
            itemsPositive: 0,
            itemsNegative: 0,
            questionsCorrect: 0,
            questionsWrong: 0,
            feverCount: 0,
            maxFeverTime: 0
        };
    }

    reset() {
        this.score = 0;
        this.feverMeter = 0;
        this.isFeverTime = false;
        this.feverDurationTimer = 0;
        this.stats = {
            itemsPositive: 0,
            itemsNegative: 0,
            questionsCorrect: 0,
            questionsWrong: 0,
            feverCount: 0,
            maxFeverTime: 0
        };
    }

    calculatePoints(item, isFever) {
        if (item.type === 'question') return 0;

        let points = item.score;
        if (item.type === 'negative') {
            points = -points;
        }

        if (isFever && points > 0) {
            points *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
        }
        return points;
    }

    addScore(points) {
        this.score += points;
        return this.score;
    }

    updateFeverMeter(points, isFever) {
        if (isFever) return this.feverMeter;

        if (points > 0) {
            const charge = GAME_CONFIG.FEVER.CHARGE_PER_ITEM || 10;
            this.feverMeter = Math.min(100, this.feverMeter + charge);
        } else if (points < 0) {
            const penalty = GAME_CONFIG.FEVER.PENALTY_PER_MISTAKE || 20;
            this.feverMeter = Math.max(0, this.feverMeter - penalty);
        }
        return this.feverMeter;
    }

    handleItemScore(item) {
        const points = this.calculatePoints(item, this.isFeverTime);
        this.addScore(points);

        if (points > 0) {
            this.stats.itemsPositive++;
            this.updateFeverMeter(points, this.isFeverTime);
        } else if (points < 0) {
            this.stats.itemsNegative++;
            this.updateFeverMeter(points, this.isFeverTime);
        }

        return {
            points,
            score: this.score,
            feverMeter: this.feverMeter,
            shouldActivateFever: !this.isFeverTime && this.feverMeter >= 100
        };
    }

    handleQuestionScore(isCorrect) {
        let points = 0;
        if (isCorrect) {
            points = GAME_CONFIG.SCORING.CORRECT_ANSWER;
            if (this.isFeverTime) points *= GAME_CONFIG.SCORING.FEVER_MULTIPLIER;
            this.stats.questionsCorrect++;
        } else {
            points = GAME_CONFIG.SCORING.INCORRECT_ANSWER;
            this.stats.questionsWrong++;
        }
        this.addScore(points);
        return {
            points,
            score: this.score
        };
    }

    activateFever() {
        this.isFeverTime = true;
        this.feverDurationTimer = GAME_CONFIG.FEVER.DURATION;
        this.stats.feverCount++;
        return this.feverDurationTimer;
    }

    deactivateFever() {
        this.isFeverTime = false;
        this.feverMeter = 0;
        this.feverDurationTimer = 0;
    }

    updateFeverTimer() {
        if (!this.isFeverTime) return null;
        
        this.feverDurationTimer--;
        this.stats.maxFeverTime++; // This counts total fever frames

        if (this.feverDurationTimer <= 0) {
            this.deactivateFever();
            return 0;
        }
        return Math.max(0, Math.floor((this.feverDurationTimer / GAME_CONFIG.FEVER.DURATION) * 100));
    }

    getScore() {
        return this.score;
    }

    getStats() {
        return { ...this.stats, score: this.score };
    }
}
