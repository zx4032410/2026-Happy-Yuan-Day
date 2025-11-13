// game-config.js

const GAME_CONFIG = {
    // 一般設定
    VERSION: "v1.0",
    USER_ID_KEY: 'yuan_fan_uid',

    // 畫布尺寸
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,

    // 玩家設定
    PLAYER: {
        WIDTH: 100,
        HEIGHT: 100,
        Y_OFFSET: 120, // 距離畫布底部的距離
        SPEED: 7,
        ANIMATION_FRAME_RATE: 15, // 數字越大，動畫越慢
        WIN_LOSE_ANIMATION_DURATION: 30, // 勝利/失敗動畫的持續幀數
    },

    // 遊戲規則
    GAME_TIME: 10, // 遊戲時間（秒）
    BASE_SPAWN_INTERVAL: 90, // 基礎生成間隔（幀），數字越小越快
    
    // Fever Time 設定
    FEVER: {
        MAX_METER: 100,
        DURATION: 600, // 持續時間（幀）
        SPAWN_INTERVAL_MULTIPLIER: 0.5, // Fever Time 的生成速度是正常的一半
        POSITIVE_ITEM_BOOST: 10,
        SPECIAL_ITEM_BOOST: 25,
    },

    // 分數設定
    SCORING: {
        CORRECT_ANSWER: 100,
        INCORRECT_ANSWER: -50,
        FEVER_MULTIPLIER: 2,
    },

    // 掉落物設定
    ITEM_DEFAULT_SIZE: 60,
    ITEM_SPAWN_Y_OFFSET: -60,
    ITEM_TYPES: [
        { id: 'heart', src: './images/item-white-heart.png', score: 10, speed: 2.5, probability: 35, type: 'positive' }, 
        { id: 'cookie', src: './images/item-bear-cookie.png', score: 25, speed: 3, probability: 25, type: 'positive' }, 
        { id: 'guitar', src: './images/item-guitar.png', score: 40, speed: 4, probability: 10, type: 'positive' }, 
        { id: 'lightstick', src: './images/item-lightstick.png', score: 80, speed: 5.5, probability: 5, type: 'special' }, 
        { id: 'burnt-cookie', src: './images/item-burnt-cookie.png', score: 20, speed: 3.5, probability: 10, type: 'negative' }, 
        { id: 'alarm', src: './images/item-alarm-clock.png', score: 35, speed: 4.5, probability: 8, type: 'negative' }, 
        { id: 'question', src: './images/question_icon.png', score: 0, speed: 4, probability: 7, type: 'question' }
    ],

    // 里程碑設定
    MILESTONES: {
        PERSONAL: {
            TIER_1_SCORE: 10000,
            TIER_2_SCORE: 25000,
            TIER_3_SCORE: 50000,
        },
        GLOBAL_TARGET: 1000000,
        REWARDS: {
            TIER_1_URL: "https://www.instagram.com/weand_studio/",
            TIER_2_MESSAGE: "恭喜您達成 Tier 2！您已獲得實體獎品抽獎資格，請等待活動結束後的官方公告。",
            TIER_3_MESSAGE: "恭喜您達成 Tier 3！您已獲得月曆卡抽獎資格，請等待活動結束後的官方公告。",
        }
    },

    // UI 與動畫時間設定 (毫秒)
    UI: {
        LOADING_FADE_DELAY: 500,
        LOADING_FADE_DURATION: 300,
        SCORE_CHANGE_DURATION: 500,
        POST_ANSWER_DELAY: 2000,
        COPY_SUCCESS_DELAY: 2000,
    },

    // 驗證設定
    VALIDATION: {
        IMPORT_ID_MIN_LENGTH: 30,
    }
};
