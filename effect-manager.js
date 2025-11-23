class EffectManager {
    constructor() {
        this.scoreEffectSystem = new ScoreEffectSystem();
    }

    addScoreEffect(x, y, score, type) {
        this.scoreEffectSystem.addEffect(x, y, score, type);
    }

    updateAndDrawScoreEffects(ctx) {
        this.scoreEffectSystem.update();
        this.scoreEffectSystem.draw(ctx);
    }

    resetScoreEffects() {
        this.scoreEffectSystem.reset();
    }

    activateFeverVisuals() {
        const gameContainer = document.getElementById('game-container');
        // if (gameContainer) gameContainer.classList.add('fever-shake'); // Removed per user request
        document.body.classList.add('fever-background');
        const feverOverlay = document.getElementById('fever-effect-overlay');
        if (feverOverlay) feverOverlay.classList.remove('hidden');
    }

    deactivateFeverVisuals() {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) gameContainer.classList.remove('fever-shake');
        document.body.classList.remove('fever-background');
        const feverOverlay = document.getElementById('fever-effect-overlay');
        if (feverOverlay) feverOverlay.classList.add('hidden');
    }
}

class ScoreEffectSystem {
    constructor() {
        this.effects = [];
    }

    addEffect(x, y, score, type) {
        this.effects.push({
            x: x,
            y: y,
            score: score,
            type: type, // 'positive', 'negative'
            life: 1.0, // 生命週期 1.0 -> 0.0
            velocityY: -2 // 向上飄移速度
        });
    }

    update() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.y += effect.velocityY;
            effect.life -= 0.02; // 減少生命值
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px "Outfit", sans-serif'; // 使用與 CSS 相同的字體

        this.effects.forEach(effect => {
            ctx.globalAlpha = Math.max(0, effect.life); // 淡出效果
            const text = (effect.score > 0 ? '+' : '') + effect.score;

            if (effect.type === 'positive') {
                ctx.fillStyle = '#2ecc71'; // 綠色
                ctx.strokeStyle = '#ffffff';
            } else {
                ctx.fillStyle = '#e74c3c'; // 紅色
                ctx.strokeStyle = '#ffffff';
            }

            ctx.lineWidth = 3;
            ctx.strokeText(text, effect.x, effect.y);
            ctx.fillText(text, effect.x, effect.y);
        });

        ctx.restore();
    }

    reset() {
        this.effects = [];
    }
}
