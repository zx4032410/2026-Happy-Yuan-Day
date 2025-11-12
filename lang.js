const i18nStrings = {
    'zh-TW': {
        score: "分數",
        time: "時間",
        fever: "應援力量",
        // 開始彈窗
        modalStartTitle: "小媛寶生日應援！",
        modalStartText: "接住媛媛喜歡的東西，為她累積應援力量吧！",
        modalStartButton: "開始遊戲",
        // 結束彈窗
        modalEndTitle: "遊戲結束！",
        modalEndText: "您為媛媛累積了 {score} 分應援！", // {score} 會被程式替換
        modalRestartButton: "重新開始",
        modalQuestionTitle: "應援小問答！",
        // ✨ 新增 (結算畫面)
        statsTitle: "本次應援成果",
        statsPositive: "接到物品",
        statsNegative: "接到障礙物",
        statsCorrect: "答對問題",
        statsWrong: "答錯問題",
        shareButton: "分享成果",
        shareText: "我剛剛在媛媛的生日應援遊戲中獲得了 {score} 分，趕快一起來累積應援分數吧！ #HappyYuanDay",
        copiedText: "已複製！",

        // ✨ 新增 (生日彩蛋)
        birthdayTitle: "🎂 Happy Birthday 🎂",
        birthdayMessage: "今天是 1 月 5 日，是媛媛的生日！\n感謝你今天也來為她應援，祝你有個美好的一天！",
        birthdayCloseButton: "關閉",
        // ✨ 新增 (進度ID轉移)
        transferTitle: "進度 ID",
        copyButton: "複製",
        copiedButton: "已複製!",
        importButton: "匯入進度",
        importPlaceholder: "貼上您的進度 ID",
        importConfirm: "確認匯入？這將覆蓋本機遊戲進度！",
        importSuccess: "匯入成功！遊戲將重新載入。",
        importError: "ID 格式無效，請貼上完整的進度 ID。",
        importUITitle: "匯入進度",
        importUIText: "請貼上你的進度 ID 同步更新進度",
        importCancelButton: "取消",
        // ✨ 新增 (個人里程碑)
        milestoneButton: "個人里程碑",
        milestoneTitle: "個人里程碑",
        milestoneDesc: "達成目標累積積分，即可獲得小獎品與大獎的抽獎機會！",
        milestoneClaimButton: "領取獎勵",
        milestoneConfirmButton: "確認",
        milestoneTier1: "數位小卡",
        milestoneTier2: "抽獎資格",
        milestoneTier3: "月曆卡抽獎",
        milestoneQualified: "已獲得資格",
        milestoneDownload: "下載獎勵",
        // ✨ 新增 (全體里程碑 與 流程控制)
        globalMilestoneButton: "全體里程碑",
        globalMilestoneTitle: "全體應援進度",
        globalMilestoneDesc: "這是所有玩家共同累積的應援力量！",
        continueButton: "繼續",
        closeButton: "關閉",
        // ✨ 修正：分享文案模板
        shareTextTemplate: "🌟 應援結果出爐！我在【媛媛生日應援小遊戲】中，本局為媛媛累積了 {score} 分！🎉\n\n累計至今，我已貢獻了 {cumulativeScore} 總應援分！一起衝向全球應援目標 {globalProgress} 吧！\n\n👉 來挑戰最高分：[遊戲連結]\n#2026happyyuanday #幻藍小熊 #GENBLUE",
        shareSuccess: "分享文案已複製到剪貼簿！",
        shareFailure: "複製失敗，請手動複製！",
        loadingTitle: "載入中...",
    },
    'en': {
        score: "Score",
        time: "Time",
        fever: "Fever",
        // 開始彈窗
        modalStartTitle: "Yuan's Birthday Support!",
        modalStartText: "Catch items Yuan loves to build up support power!",
        modalStartButton: "Start Game",
        // 結束彈窗
        modalEndTitle: "Game Over!",
        modalEndText: "You earned {score} support points for Yuan!",
        modalRestartButton: "Restart",
        modalQuestionTitle: "Support Quiz!",
        
        // ✨ 新增 (結算畫面)
        statsTitle: "Support Results",
        statsPositive: "Items Caught",
        statsNegative: "Obstacles Hit",
        statsCorrect: "Quiz Correct",
        statsWrong: "Quiz Wrong",
        shareButton: "Share Score",
        shareText: "I just got {score} points in Yuan's Birthday Support Game! Come join us and collect points! #HappyYuanDay",
        copiedText: "Copied!",

        // ✨ 新增 (生日彩蛋)
        birthdayTitle: "🎂 Happy Birthday 🎂",
        birthdayMessage: "Today is January 5th, Yuan's Birthday!\nThank you for supporting her today. Have a wonderful day!",
        birthdayCloseButton: "Close",

        // ✨ 新增 (進度ID轉移)
        transferTitle: "Progress ID",
        copyButton: "Copy",
        copiedButton: "Copied!",
        importButton: "Import Progress",
        importPlaceholder: "Paste your Progress ID here",
        importConfirm: "Confirm import? This will overwrite local progress!",
        importSuccess: "Import successful! The game will reload.",
        importError: "Invalid ID format. Please paste the full ID.",
        importUITitle: "Import Progress",
        importUIText: "Please paste your Progress ID to sync progress",
        importCancelButton: "Cancel",
        // ✨ 新增 (個人里程碑)
        milestoneButton: "Milestones",
        milestoneTitle: "Personal Milestones",
        milestoneDesc: "Reach score goals to get digital cards and chances to win grand prizes!",
        milestoneClaimButton: "Claim Reward",
        milestoneConfirmButton: "Confirm",
        milestoneTier1: "Digital Card",
        milestoneTier2: "Raffle Entry",
        milestoneTier3: "Calender Raffle",
        milestoneQualified: "Qualified",
        milestoneDownload: "Download Reward",
        // ✨ 新增 (全體里程碑 與 流程控制)
        globalMilestoneButton: "Global Milestone",
        globalMilestoneTitle: "Global Support Progress",
        globalMilestoneDesc: "This is the total support power collected by all players!",
        continueButton: "Continue",
        closeButton: "Close",
        // ✨ 修正：分享文案模板
        shareTextTemplate: "🌟 Result out! I scored {score} points for Yuan in the [Yuan's Birthday Support Game]! 🎉\n\nMy total cumulative support score is {cumulativeScore}! Let's hit the Global Milestone of {globalProgress} together!\n\n👉 Challenge me: [Game Link]\n#2026happyyuanday #GENBLUE",
        loadingTitle: "Loading...",
    }
};