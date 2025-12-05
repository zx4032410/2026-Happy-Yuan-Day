class DatabaseManager {
  constructor() {
    // Initialize Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyA5vu1AzlUPRbszYzjM0WTxpxZmJhbUR74",
      authDomain: "yuan-birthday-gam.firebaseapp.com",
      projectId: "yuan-birthday-gam",
      storageBucket: "yuan-birthday-gam.firebasestorage.app",
      messagingSenderId: "891333323583",
      appId: "1:891333323583:web:2bdf6e420db3ba9f5b018a",
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    } else {
      firebase.app(); // if already initialized, use that one
    }

    this.db = firebase.firestore();
    this.auth = firebase.auth();
    this.currentUserID = null;
    this.playerProfile = {
      cumulativeScore: 0,
      claimedTier1: false,
      tier2Qualified: false,
      tier3Qualified: false,
      instagramHandle: null,
    };
    this.currentClaimingTier = null;
  }

  /**
   * Initialize Authentication Listener
   * @param {Function} onLoginSuccess - Callback when login is successful
   * @param {Function} onLoginFailure - Callback when login fails
   */
  handleAuthentication(onLoginSuccess, onLoginFailure) {
    // 使用預設的 LOCAL 持久化，確保玩家分數能夠累積
    // Storage 警告可能仍會出現，但不影響功能
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUserID = user.uid;
        // console.log("Firebase 匿名登入成功，UID:", this.currentUserID);
        await this.loadPlayerProfile();
        if (onLoginSuccess) onLoginSuccess(this.currentUserID);
      } else {
        // console.log("使用者未登入，正在嘗試匿名登入...");
        try {
          await this.auth.signInAnonymously();
          // console.log("匿名登入請求成功。");
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
      // console.log("尚未取得 UserID 或 DB，無法讀取個人資料。");
      return;
    }
    const playerRef = this.db.collection("players").doc(this.currentUserID);
    try {
      const doc = await playerRef.get();
      if (doc.exists) {
        // console.log("成功讀取玩家資料:", doc.data());
        this.playerProfile = {
          ...{
            cumulativeScore: 0,
            claimedTier1: false,
            tier2Qualified: false,
            tier3Qualified: false,
            instagramHandle: null,
          },
          ...doc.data(),
        };
      } else {
        // console.log("找不到玩家資料，將在遊戲結束後自動建立。");
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
  /**
   * Upload Score to Firestore
   * @param {string} userId
   * @param {Object} currentStats
   * @returns {Promise<void>}
   */
  async saveScore(userId, currentStats) {
    if (!this.currentUserID || !this.db) {
      // console.log("尚未取得 UserID 或 DB，無法上傳分數。");
      return;
    }

    const batch = this.db.batch();
    const scoreRef = this.db.collection("scores").doc();
    const scoreData = {
      userId: this.currentUserID,
      score: currentStats.score,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      version: GAME_CONFIG.VERSION,
      stats: currentStats,
    };
    batch.set(scoreRef, scoreData);

    // 更新全域統計總分
    const globalStatsRef = this.db.collection('statistics').doc('global');
    batch.set(globalStatsRef, {
        totalScore: firebase.firestore.FieldValue.increment(currentStats.score),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const playerRef = this.db.collection("players").doc(this.currentUserID);

    try {
      const playerDoc = await playerRef.get();
      const existingData = playerDoc.exists ? playerDoc.data() : {};

      const requiredFields = {
        claimedTier1: false,
        tier2Qualified: false,
        tier3Qualified: false,
        instagramHandle: null,
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
          cumulativeScore: currentStats.score,
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
          ...requiredFields,
        };
        batch.set(playerRef, initialPlayerData);
      } else if (hasMissingFields) {
        const updateData = {
          cumulativeScore: firebase.firestore.FieldValue.increment(
            currentStats.score
          ),
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
          ...missingFields,
        };
        batch.set(playerRef, updateData, { merge: true });
      } else {
        const playerData = {
          cumulativeScore: firebase.firestore.FieldValue.increment(
            currentStats.score
          ),
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
        };
        batch.set(playerRef, playerData, { merge: true });
      }

      await batch.commit();
      this.playerProfile.cumulativeScore += currentStats.score;
    } catch (error) {
      console.error("分數上傳或個人總分累加失敗:", error);
    }
  }

  /**
   * Load Total Global Milestone Score
   * @returns {Promise<string>} Progress percentage string (e.g., "50.5%")
   */
  async loadTotalMilestoneScore() {
    if (!this.db) return "0%";
    let totalScore = 0;
    let progressPercent = "0%";
    try {
      const globalStatsRef = this.db.collection("statistics").doc("global");
      const globalStatsDoc = await globalStatsRef.get();

      if (globalStatsDoc.exists) {
        totalScore = globalStatsDoc.data().totalScore || 0;
      } else {
        // 如果統計文件不存在（首次執行），則建立初始文件
        await globalStatsRef.set({
          totalScore: 0,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
        totalScore = 0;
      }

      // console.log("目前里程碑總分: ", totalScore);
      const milestoneTarget = GAME_CONFIG.MILESTONES.GLOBAL_TARGET;
      progressPercent =
        Math.min(100, (totalScore / milestoneTarget) * 100).toFixed(1) + "%";
    } catch (error) {
      console.error("讀取總分失敗: ", error);
    }
    return progressPercent;
  }

  /**
   * Submit IG Handle
   * @param {string} handle
   * @returns {Promise<void>}
   */
  async saveInstagramHandle(handle) {
    if (!this.currentUserID || !this.db) {
      throw new Error("Database not initialized");
    }

    const playerRef = this.db.collection("players").doc(this.currentUserID);
    await playerRef.update({
      instagramHandle: handle,
    });
    this.playerProfile.instagramHandle = handle;
  }

  /**
   * Claim Tier Reward
   * @param {number} tier
   */
  async claimTier(tier) {
    if (!this.currentUserID || !this.db) return;
    const playerRef = this.db.collection("players").doc(this.currentUserID);

    const updateData = {};
    if (tier === 1) updateData.claimedTier1 = true;
    else if (tier === 2) updateData.tier2Qualified = true;
    else if (tier === 3) updateData.tier3Qualified = true;

    await playerRef.update(updateData);

    if (tier === 1) this.playerProfile.claimedTier1 = true;
    else if (tier === 2) this.playerProfile.tier2Qualified = true;
    else if (tier === 3) this.playerProfile.tier3Qualified = true;
  }

  /**
   * Mark Tier 3 as Qualified (for users who already have IG handle)
   */
  async markTier3Qualified() {
    if (!this.currentUserID || !this.db) return;
    const playerRef = this.db.collection("players").doc(this.currentUserID);
    await playerRef.update({
      tier3Qualified: true,
    });
    this.playerProfile.tier3Qualified = true;
  }
}
