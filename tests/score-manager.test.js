import ScoreManager from '../js/managers/score-manager.js';
import { GAME_CONFIG } from '../js/game-config.js';

describe('ScoreManager', () => {
    let scoreManager;

    beforeEach(() => {
        scoreManager = new ScoreManager();
    });

    test('should initialize with score 0', () => {
        expect(scoreManager.getScore()).toBe(0);
    });

    test('should correctly calculate points for positive items', () => {
        const item = { type: 'positive', score: 10 };
        const result = scoreManager.handleItemScore(item);
        expect(result.points).toBe(10);
        expect(result.score).toBe(10);
        expect(scoreManager.getStats().itemsPositive).toBe(1);
    });

    test('should correctly calculate points for negative items', () => {
        const item = { type: 'negative', score: 20 };
        const result = scoreManager.handleItemScore(item);
        expect(result.points).toBe(-20);
        expect(result.score).toBe(-20);
        expect(scoreManager.getStats().itemsNegative).toBe(1);
    });

    test('should apply fever multiplier to positive items during fever time', () => {
        scoreManager.isFeverTime = true;
        const item = { type: 'positive', score: 10 };
        const result = scoreManager.handleItemScore(item);
        expect(result.points).toBe(10 * GAME_CONFIG.SCORING.FEVER_MULTIPLIER);
    });

    test('should NOT apply fever multiplier to negative items during fever time', () => {
        scoreManager.isFeverTime = true;
        const item = { type: 'negative', score: 20 };
        const result = scoreManager.handleItemScore(item);
        expect(result.points).toBe(-20);
    });

    test('should update fever meter correctly', () => {
        const item = { type: 'positive', score: 10 };
        const charge = GAME_CONFIG.FEVER.CHARGE_PER_ITEM || 10;
        const result = scoreManager.handleItemScore(item);
        expect(result.feverMeter).toBe(charge);
    });

    test('should activate fever when meter reaches 100', () => {
        scoreManager.feverMeter = 90;
        const item = { type: 'positive', score: 10 };
        const result = scoreManager.handleItemScore(item);
        expect(result.shouldActivateFever).toBe(true);
    });

    test('should correctly handle question scores (correct)', () => {
        const result = scoreManager.handleQuestionScore(true);
        expect(result.points).toBe(GAME_CONFIG.SCORING.CORRECT_ANSWER);
        expect(scoreManager.getStats().questionsCorrect).toBe(1);
    });

    test('should correctly handle question scores (wrong)', () => {
        const result = scoreManager.handleQuestionScore(false);
        expect(result.points).toBe(GAME_CONFIG.SCORING.INCORRECT_ANSWER);
        expect(scoreManager.getStats().questionsWrong).toBe(1);
    });
});
