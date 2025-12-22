import GameStateManager, { GameState } from '../js/managers/game-state-manager.js';
import { GAME_CONFIG } from '../js/game-config.js';
import { jest } from '@jest/globals'; // ✨ Explicit import for ESM

describe('GameStateManager', () => {
    let gameStateManager;
    let mockOnTimeUp;
    let mockOnTimeUpdate;

    beforeAll(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        mockOnTimeUp = jest.fn();
        mockOnTimeUpdate = jest.fn();
        gameStateManager = new GameStateManager({
            onTimeUp: mockOnTimeUp,
            onTimeUpdate: mockOnTimeUpdate
        });
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    test('should initialize with STOPPED state', () => {
        expect(gameStateManager.state).toBe(GameState.STOPPED);
        expect(gameStateManager.getTimeLeft()).toBe(GAME_CONFIG.GAME_TIME);
    });

    test('should change state to PLAYING on start', () => {
        gameStateManager.startGame();
        expect(gameStateManager.state).toBe(GameState.PLAYING);
        expect(gameStateManager.isPlaying()).toBe(true);
    });

    test('should decrease time and call onTimeUpdate', () => {
        gameStateManager.startGame();
        
        // Advance 1 second
        jest.advanceTimersByTime(1000);
        
        expect(mockOnTimeUpdate).toHaveBeenCalledWith(GAME_CONFIG.GAME_TIME - 1);
        expect(gameStateManager.getTimeLeft()).toBe(GAME_CONFIG.GAME_TIME - 1);
    });

    test('should stop game and call onTimeUp when time runs out', () => {
        gameStateManager.startGame();
        
        // Advance all time
        jest.advanceTimersByTime(GAME_CONFIG.GAME_TIME * 1000 + 100);

        expect(mockOnTimeUp).toHaveBeenCalled();
        expect(gameStateManager.state).toBe(GameState.STOPPED);
        expect(gameStateManager.getTimeLeft()).toBe(0);
    });

    test('should pause and resume game correctly', () => {
        gameStateManager.startGame();
        jest.advanceTimersByTime(1000); // 44s
        
        gameStateManager.pauseGame();
        expect(gameStateManager.state).toBe(GameState.PAUSED);
        expect(gameStateManager.isPaused()).toBe(true);
        
        // Time should not advance while paused
        jest.advanceTimersByTime(2000);
        expect(gameStateManager.getTimeLeft()).toBe(GAME_CONFIG.GAME_TIME - 1);

        gameStateManager.resumeGame();
        expect(gameStateManager.state).toBe(GameState.PLAYING);
        
        // Time should continue advancing
        jest.advanceTimersByTime(1000);
        expect(gameStateManager.getTimeLeft()).toBe(GAME_CONFIG.GAME_TIME - 2);
    });

    test('should stop timer when game is stopped manually', () => {
        gameStateManager.startGame();
        gameStateManager.stopGame();
        
        expect(gameStateManager.state).toBe(GameState.STOPPED);
        
        // Time should not advance
        jest.advanceTimersByTime(1000);
        expect(mockOnTimeUpdate).not.toHaveBeenCalled();
    });
});
