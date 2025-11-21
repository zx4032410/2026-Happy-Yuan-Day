// /questions.js
// 重構為多國語言題庫

const QUESTION_BANK = [
    {
        id: 'q1', // 題目ID
        'zh-TW': { // 繁中
            question: "媛媛的生日是幾月幾號？",
            correctAnswer: "1/5",
            incorrectAnswers: ["1/4", "1/6"]
        },
        'en': { // 英文
            question: "When is Yuan's birthday?",
            correctAnswer: "1/5",
            incorrectAnswers: ["1/4", "1/6"]
        }
    },
    {
        id: 'q2',
        'zh-TW': {
            question: "媛媛家的貓咪叫做什麼？",
            correctAnswer: "COOKIE",
            incorrectAnswers: ["RUBY", "MONEY"]
        },
        'en': {
            question: "What is the name of Yuan's cat?",
            correctAnswer: "COOKIE",
            incorrectAnswers: ["RUBY", "MONEY"]
        }
    },
    {
        id: 'q3',
        'zh-TW': {
            question: "今年生日咖啡廳的活動時間是什麼時候？",
            correctAnswer: "1/3 ~ 1/6",
            incorrectAnswers: ["1/4 ~ 1/8", "1/1 ~ 1/31"]
        },
        'en': {
            question: "When is the birthday cafe event this year?",
            correctAnswer: "1/3 ~ 1/6",
            incorrectAnswers: ["1/4 ~ 1/8", "1/1 ~ 1/31"]
        }
    },
    {
        id: 'q4',
        'zh-TW': {
            question: "媛媛來自台灣的哪個城市？",
            correctAnswer: "高雄市",
            incorrectAnswers: ["台北市", "台中市"]
        },
        'en': {
            question: "Which city in Taiwan is Yuan from?",
            correctAnswer: "Kaohsiung",
            incorrectAnswers: ["Taipei", "Taichung"]
        }
    },
    {
        id: 'q5',
        'zh-TW': {
            question: "以下哪首歌不是媛媛有參與作詞的",
            correctAnswer: "《SO WHAT》",
            incorrectAnswers: ["《OH!(中文版)》", "《一起走》"]
        },
        'en': {
            question: "Which of the following songs was not co-written by Yuan?",
            correctAnswer: "《SO WHAT》",
            incorrectAnswers: ["《OH!(中文版)》", "《一起走》"]
        }
    },
    {
        id: 'q6',
        'zh-TW': {
            question: "在娛樂超skr中，媛媛被團員爆料了哪一點",
            correctAnswer: "私服穿搭最特別",
            incorrectAnswers: ["每天都賴床", "會在床上吃零食"]
        },
        'en': {
            question: "In 娛樂超skr, what did the members reveal about Yuan?",
            correctAnswer: "Her casual outfits are the most unique",
            incorrectAnswers: ["Wakes up late every day", "Eats snacks in bed"]
        }
    },
    {
        id: 'q7',
        'zh-TW': {
            question: "媛媛在1/18演唱會的時候表示金姐跟于哥哪個人她比較喜歡？",
            correctAnswer: "金姐",
            incorrectAnswers: ["于哥", "當然都喜歡啊"]
        },
        'en': {
            question: "At the 1/18 concert, who did Yuan say she preferred between 金姐 and 于哥?",
            correctAnswer: "金姐",
            incorrectAnswers: ["于哥", "Of course, I like both!"]
        }
    },
    {
        id: 'q8',
        'zh-TW': {
            question: "媛媛曾經在娛樂百分百的訪談中說過不當偶像想當什麼職業？",
            correctAnswer: "海生館員工",
            incorrectAnswers: ["空服員", "寵物店員工"]
        },
        'en': {
            question: "In an interview on 娛樂百分百, what profession did Yuan say she would pursue if not an idol?",
            correctAnswer: "Aquarium staff",
            incorrectAnswers: ["Flight attendant", "Pet shop employee"]
        }
    },
    {
        id: 'q9',
        'zh-TW': {
            question: "這次的生日咖啡廳靠近台北捷運哪個站？",
            correctAnswer: "信義安和站",
            incorrectAnswers: ["大安站", "忠孝新生站"]
        },
        'en': {
            question: "Which Taipei MRT station is this birthday cafe near?",
            correctAnswer: "Xinyi Anhe Station",
            incorrectAnswers: ["Dahan Station", "Zhongxiao Xingsheng Station"]
        }
    },
    {
        id: 'q10',
        'zh-TW': {
            question: "以下哪個是這次生日應援禮包的發送地點？",
            correctAnswer: "以上皆是",
            incorrectAnswers: ["LivingRoom客廳咖啡", "耍廢茶"]
        },
        'en': {
            question: "Which of the following is a distribution location for this birthday support gift package?",
            correctAnswer: "All of the above",
            incorrectAnswers: ["LivingRoom客廳咖啡", "耍廢茶"]
        }
    },
    {
        id: 'q11',
        'zh-TW': {
            question: "今年是媛媛的幾歲生日？",
            correctAnswer: "21歲",
            incorrectAnswers: ["18歲", "20歲"]
        },
        'en': {
            question: "How old is Yuan celebrating this birthday?",
            correctAnswer: "21 years old",
            incorrectAnswers: ["18 years old", "20 years old"]
        }
    },
    {
        id: 'q12',
        'zh-TW': {
            question: "11/08的演唱會 媛媛演唱的Solo曲是什麼？",
            correctAnswer: "我是真的很愛很愛你",
            incorrectAnswers: ["我是真的真的很愛你", "我是真的很喜歡你"]
        },
        'en': {
            question: "What was Yuan's solo song at the 11/08 concert?",
            correctAnswer: "我是真的很愛很愛你",
            incorrectAnswers: ["我是真的真的很愛你", "我是真的很喜歡你"]
        }
    },
    {
        id: 'q13',
        'zh-TW': {
            question: "媛媛曾經提過喜歡哪個電影系列？",
            correctAnswer: "哈利波特系列",
            incorrectAnswers: ["漫威英雄系列", "神鬼奇航系列"]
        },
        'en': {
            question: "Which movie series did Yuan mention she likes?",
            correctAnswer: "Harry Potter series",
            incorrectAnswers: ["Marvel Cinematic Universe", "Pirates of the Caribbean series"]
        }
    }
    // TODO: 在這裡新增更多題目！
];