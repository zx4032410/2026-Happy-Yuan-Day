class DatabaseManager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentUserID = null;
        this.playerProfile = {
            cumulativeScore: 0,
            claimedTier1: false,
            tier2Qualified: false,
            tier3Qualified: false,
            instagramHandle: null
        };
        this.currentClaimingTier = null;
    }

    /**
     * Initialize Authentication Listener
     * @param {Function} onLoginSuccess - Callback when login is successful
     * @param {Function} onLoginFailure - Callback when login fails
     */
    handleAuthentication(onLoginSuccess, onLoginFailure) {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUserID = user.uid;
                console.log("Firebase 匿名登入成功，UID:", this.currentUserID);
                await this.loadPlayerProfile();
                if (onLoginSuccess) onLoginSuccess(this.currentUserID);
            } else {
                console.log("使用者未登入，正在嘗試匿名登入...");
                try {
                    await this.auth.signInAnonymously();
                    console.log("匿名登入請求成功。");
                } catch (error) {
                    console.error("Firebase 匿名登入失敗:", error);
                    if (onLoginFailure) onLoginFailure(error);
                }
            }
        });
    }

    /**
     * Load Player Profile from Firestore
     */
    async loadPlayerProfile() {
        if (!this.currentUserID || !this.db) {
            console.log("尚未取得 UserID 或 DB，無法讀取個人資料。");
            return;
        }
        const playerRef = this.db.collection('players').doc(this.currentUserID);
        try {
            const doc = await playerRef.get();
            if (doc.exists) {
                console.log("成功讀取玩家資料:", doc.data());
                this.playerProfile = {
                    ...{ cumulativeScore: 0, claimedTier1: false, tier2Qualified: false, tier3Qualified: false, instagramHandle: null },
                    ...doc.data()
                };
            } else {
                console.log("找不到玩家資料，將在遊戲結束後自動建立。");
            }
        } catch (error) {
            console.error("讀取玩家資料失敗:", error);
        }
    }

    /**
     * Upload Score to Firestore
     * @param {number} score 
     * @param {Object} currentStats 
     * @param {boolean} isBirthday 
     * @returns {Promise<void>}
     */
    async uploadScore(score, currentStats, isBirthday) {
        if (!this.currentUserID || !this.db) {
            console.log("尚未取得 UserID 或 DB，無法上傳分數。");
            return;
        }

        const batch = this.db.batch();
        const scoreRef = this.db.collection('scores').doc();
        const scoreData = {
            userId: this.currentUserID,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            version: GAME_CONFIG.VERSION,
            isBirthday: isBirthday,
            stats: currentStats,
        };
        batch.set(scoreRef, scoreData);

        const playerRef = this.db.collection('players').doc(this.currentUserID);

        try {
            const playerDoc = await playerRef.get();
            const existingData = playerDoc.exists ? playerDoc.data() : {};

            const requiredFields = {
                claimedTier1: false,
                tier2Qualified: false,
                tier3Qualified: false,
                instagramHandle: null
            };

            const missingFields = {};
            let hasMissingFields = false;
            for (const [field, defaultValue] of Object.entries(requiredFields)) {
                if (!(field in existingData)) {
                    missingFields[field] = defaultValue;
                    hasMissingFields = true;
                }
            }

            if (!playerDoc.exists) {
                const initialPlayerData = {
                    cumulativeScore: score,
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    ...requiredFields
                };
                batch.set(playerRef, initialPlayerData);
                console.log("建立新的玩家資料，包含所有必要欄位");
            } else if (hasMissingFields) {
                const updateData = {
                    cumulativeScore: firebase.firestore.FieldValue.increment(score),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    ...missingFields
                };
                batch.set(playerRef, updateData, { merge: true });
                console.log("更新玩家資料並補上缺少的欄位:", Object.keys(missingFields));
            } else {
                const playerData = {
                    cumulativeScore: firebase.firestore.FieldValue.increment(score),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                };
                batch.set(playerRef, playerData, { merge: true });
                console.log("更新現有玩家資料的分數");
            }

            await batch.commit();
            console.log("分數上傳與個人總分累加成功 (Batch Commit)！");
            this.playerProfile.cumulativeScore += score;
        } catch (error) {
            console.error("分數上傳或個人總分累加失敗:", error);
        }
    }

    /**
     * Load Total Global Milestone Score
     * @returns {Promise<string>} Progress percentage string (e.g., "50.5%")
     */
    async loadTotalMilestoneScore() {
        if (!this.db) return '0%';
        let totalScore = 0;
        let progressPercent = '0%';
        try {
            const querySnapshot = await this.db.collection("scores").get();
            querySnapshot.forEach((doc) => {
                totalScore += doc.data().score;
            });
            console.log("目前里程碑總分: ", totalScore);
            const milestoneTarget = GAME_CONFIG.MILESTONES.GLOBAL_TARGET;
            progressPercent = Math.min(100, (totalScore / milestoneTarget) * 100).toFixed(1) + '%';
        } catch (error) {
            console.error("讀取總分失敗: ", error);
        }
        return progressPercent;
    }

    /**
     * Submit IG Handle
     * @param {string} handle 
     * @param {number|null} tier - The tier being claimed, or null for edit mode
     * @returns {Promise<void>}
     */
    async submitIgHandle(handle, tier) {
        if (!this.currentUserID || !this.db) {
            throw new Error("Database not initialized");
        }

        const playerRef = this.db.collection('players').doc(this.currentUserID);

        if (tier) {
            // Claiming reward mode
            const tierField = `tier${tier}Qualified`;
            await playerRef.update({
                instagramHandle: handle,
                [tierField]: true
            });
            this.playerProfile.instagramHandle = handle;
            this.playerProfile[tierField] = true;
        } else {
            // Edit mode
            await playerRef.update({
                instagramHandle: handle
            });
            this.playerProfile.instagramHandle = handle;
        }
    }

    /**
     * Mark Tier 3 as Qualified (for users who already have IG handle)
     */
    async markTier3Qualified() {
        if (!this.currentUserID || !this.db) return;
        const playerRef = this.db.collection('players').doc(this.currentUserID);
        await playerRef.update({
            tier3Qualified: true
        });
        this.playerProfile.tier3Qualified = true;
    }
}
