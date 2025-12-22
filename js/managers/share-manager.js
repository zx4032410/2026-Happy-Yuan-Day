export default class ShareManager {
    constructor() {
        this.currentShareFormat = 'square'; // 'square' or 'story'
        this.scoreCardCache = {
            square: null,
            story: null,
            stats: null
        };
        this.shareCardImage = new Image();
        // ✨ 修復 CORS 問題：必須在設置 src 之前設置 crossOrigin
        this.shareCardImage.crossOrigin = 'anonymous';
        this.shareCardImage.src = './images/sharecard.PNG';
        // Preload image
        this.shareCardImage.onload = () => { }; // console.log('Share card image loaded');
        this.shareCardImage.onerror = () => console.error('Failed to load share card image');
    }

    /**
     * Generate QR Code Data URL
     * @param {string} url 
     * @param {number} size 
     * @returns {string} Data URL
     */
    generateQRCode(url, size = 4) {
        if (typeof qrcode === 'undefined') {
            console.error('QRCode library not loaded');
            return '';
        }
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        return qr.createDataURL(size);
    }

    /**
     * Generate Score Card
     * @param {Object} gameStats 
     * @param {string} format 
     * @returns {Promise<string>} Image Data URL
     */
    async generateScoreCard(gameStats, format = 'square') {
        // Cache check
        if (this.scoreCardCache[format] &&
            this.scoreCardCache.stats &&
            JSON.stringify(this.scoreCardCache.stats) === JSON.stringify(gameStats)) {
            // console.log(`✅ Using cached ${format} card`);
            return new Promise((resolve) => {
                const canvas = document.getElementById('scoreCardCanvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    resolve(this.scoreCardCache[format]);
                };
                img.src = this.scoreCardCache[format];
            });
        }

        // console.log(`🎨 Generating new ${format} card...`);
        return new Promise((resolve) => {
            const canvas = document.getElementById('scoreCardCanvas');
            const ctx = canvas.getContext('2d');

            if (format === 'story') {
                canvas.width = 1080;
                canvas.height = 1920;
            } else {
                canvas.width = 1080;
                canvas.height = 1080;
            }

            const width = canvas.width;
            const height = canvas.height;

            // Background - 使用遊戲風格的深色漸層
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#1a1a2e'); // 深藍黑色
            gradient.addColorStop(0.5, '#252540'); // 遊戲主背景色
            gradient.addColorStop(1, '#16213e'); // 更深的藍黑色
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Content Area - 使用半透明的深色背景而非白色
            const padding = 80;
            const contentWidth = width - (padding * 2);
            const contentHeight = height - (padding * 2);

            // 深色半透明背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(padding, padding, contentWidth, contentHeight, 30);
                ctx.fill();
            } else {
                ctx.fillRect(padding, padding, contentWidth, contentHeight);
            }

            // 添加邊框光暈效果
            ctx.strokeStyle = '#f72585'; // 粉紅色邊框
            ctx.lineWidth = 4;
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(padding, padding, contentWidth, contentHeight, 30);
                ctx.stroke();
            }

            // Layout calculations
            const isStory = format === 'story';
            const titleY = isStory ? 200 : 180;
            const subtitleY = titleY + 60;
            const dividerY = subtitleY + 40;
            const statsStartY = dividerY + 80;
            const statsSpacing = isStory ? 100 : 90;

            // Title
            ctx.fillStyle = '#ffffff'; // 白色標題
            ctx.font = 'bold 72px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎮 2026 Happy Yuan Day', width / 2, titleY);

            // Divider
            ctx.strokeStyle = '#f72585'; // 粉紅色分隔線
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(padding + 100, dividerY);
            ctx.lineTo(width - padding - 100, dividerY);
            ctx.stroke();

            // Stats
            const stats = [
                { label: '本局分數', value: gameStats.score, emoji: '⭐' },
                { label: '接到物品', value: gameStats.itemsCaught, emoji: '🎯' },
                { label: '答對題數', value: gameStats.correctAnswers, emoji: '✅' },
                { label: '答錯題數', value: gameStats.wrongAnswers, emoji: '❌' },
            ];

            ctx.textAlign = 'left';
            let yPosition = statsStartY;

            stats.forEach(stat => {
                const leftMargin = padding + 100;
                const rightMargin = width - padding - 100;

                ctx.font = '48px Arial';
                ctx.fillText(stat.emoji, leftMargin, yPosition);

                ctx.font = 'bold 42px Arial, sans-serif';
                ctx.fillStyle = '#ffffff'; // 白色標籤
                ctx.fillText(stat.label, leftMargin + 80, yPosition);

                ctx.font = 'bold 48px Arial, sans-serif';
                ctx.fillStyle = '#f72585'; // 粉紅色數值
                ctx.textAlign = 'right';
                ctx.fillText(String(stat.value), rightMargin, yPosition);
                ctx.textAlign = 'left';

                yPosition += statsSpacing;
            });

            // QR Code
            const gameURL = window.location.href;
            const qrDataURL = this.generateQRCode(gameURL, 6);
            const qrImage = new Image();
            qrImage.crossOrigin = 'anonymous'; // ✨ 修復 CORS 問題

            qrImage.onload = () => {
                const qrSize = isStory ? 220 : 200;
                const qrX = width - padding - qrSize - 50;
                const qrY = height - padding - qrSize - 50;

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
                ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

                // Share Card Image (Character)
                if (this.shareCardImage && this.shareCardImage.complete) {
                    const cardAspectRatio = this.shareCardImage.width / this.shareCardImage.height;
                    let cardWidth, cardHeight, cardX, cardY;

                    if (isStory) {
                        cardHeight = 700;
                        cardWidth = cardHeight * cardAspectRatio;
                        cardX = padding - 80;
                        cardY = height - cardHeight - padding + 120;
                    } else {
                        cardHeight = 490;
                        cardWidth = cardHeight * cardAspectRatio;
                        cardX = padding - 80;
                        cardY = height - cardHeight - padding + 100;
                    }
                    ctx.drawImage(this.shareCardImage, cardX, cardY, cardWidth, cardHeight);
                }

                const imageDataURL = canvas.toDataURL('image/png', 0.95);

                // Update Cache
                this.scoreCardCache[format] = imageDataURL;
                this.scoreCardCache.stats = { ...gameStats };
                // console.log(`💾 ${format} card cached`);

                resolve(imageDataURL);
            };
            qrImage.src = qrDataURL;
        });
    }

    /**
     * Switch Share Format
     * @param {string} format 
     * @param {Object} gameStats 
     * @param {string} currentLang 
     * @param {Object} i18nStrings 
     * @returns {Promise<string>} New Image URL
     */
    async switchShareFormat(format, gameStats, currentLang, i18nStrings) {
        this.currentShareFormat = format;

        // Update Buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-format="${format}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update Tip
        const shareTipElement = document.getElementById('share-tip');
        if (shareTipElement && i18nStrings && i18nStrings[currentLang]) {
            const tipText = format === 'story'
                ? i18nStrings[currentLang].shareTipStory
                : i18nStrings[currentLang].shareTipSquare;
            shareTipElement.textContent = tipText;
        }

        return await this.generateScoreCard(gameStats, format);
    }

    /**
     * Download Image
     * @param {string} dataURL 
     */
    downloadImage(dataURL) {
        const formatSuffix = this.currentShareFormat === 'story' ? 'story' : 'square';
        const filename = `yuan-game-score-${formatSuffix}-${Date.now()}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Share Image via Web Share API
     * @param {string} dataURL 
     * @param {Object} gameStats 
     */
    async shareImage(dataURL, gameStats) {
        try {
            const response = await fetch(dataURL);
            const blob = await response.blob();

            const formatSuffix = this.currentShareFormat === 'story' ? 'story' : 'square';
            const filename = `yuan-game-${formatSuffix}.png`;
            const file = new File([blob], filename, { type: 'image/png' });

            const shareTitle = '2026 Happy Yuan Day - 媛來接力';
            const shareText = this.currentShareFormat === 'story'
                ? `我在「媛來接力」得到 ${gameStats.score} 分！🎮\n快來挑戰看看你能得幾分！`
                : `我的遊戲成績：${gameStats.score} 分 🎯\n一起來「媛來接力」玩遊戲！`;

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    files: [file]
                });
                // console.log('✅ Shared successfully!');
            } else {
                // console.log('⚠️ Web Share API not supported, falling back to download');
                this.downloadImage(dataURL);
                this.showShareTip();
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                // console.log('ℹ️ Share cancelled');
            } else {
                console.error('❌ Share failed:', error);
                this.downloadImage(dataURL);
                this.showShareTip();
            }
        }
    }

    /**
     * Show Share Tip Fallback
     */
    showShareTip() {
        const tipMessage = this.currentShareFormat === 'story'
            ? '✨ 圖片已下載！\n\n請至相簿選擇圖片，然後:\n1. 開啟 Instagram\n2. 點選左上角「+」建立限時動態\n3. 選擇剛下載的圖片\n4. 直接分享到限動！'
            : '✨ 圖片已下載！\n\n您可以:\n1. 分享到 Instagram 貼文\n2. 傳送給朋友\n3. 發布到其他社群平台';

        alert(tipMessage);
    }
}
