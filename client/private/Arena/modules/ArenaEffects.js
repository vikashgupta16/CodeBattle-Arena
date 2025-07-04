/**
 * ArenaEffects.js - Visual effects and animations for the arena
 */

class ArenaEffects {
    constructor() {
        this.effectsEnabled = true;
    }

    // ARENA ENTRANCE EFFECTS - MAXIMUM INTENSITY! 🔥⚡
    createArenaEntrance() {
        if (!this.effectsEnabled) return;

        // Create lightning strikes across the screen
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const lightning = document.createElement('div');
                lightning.className = 'lightning-strike';
                lightning.style.cssText = `
                    position: fixed;
                    top: -10px;
                    left: ${Math.random() * 100}%;
                    width: 3px;
                    height: 100vh;
                    background: linear-gradient(180deg, transparent, var(--arena-electric), transparent);
                    box-shadow: 0 0 20px var(--arena-electric);
                    animation: lightning-flash 0.3s ease-out;
                    z-index: 9999;
                    pointer-events: none;
                `;
                document.body.appendChild(lightning);
                
                // Remove after animation
                setTimeout(() => lightning.remove(), 300);
            }, i * 200);
        }
        
        // Add arena entrance sound effect (visual feedback)
        document.body.style.animation = 'arena-entrance 1s ease-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1000);
    }

    // BATTLE VICTORY CELEBRATION! 🏆⚡
    createVictoryExplosion() {
        if (!this.effectsEnabled) return;

        const explosions = ['💥', '⚡', '🔥', '⭐', '💀', '⚔️', '🏆', '👑'];
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const explosion = document.createElement('div');
                explosion.textContent = explosions[Math.floor(Math.random() * explosions.length)];
                explosion.style.cssText = `
                    position: fixed;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    font-size: ${Math.random() * 3 + 2}rem;
                    animation: victory-explosion 2s ease-out forwards;
                    z-index: 9999;
                    pointer-events: none;
                `;
                document.body.appendChild(explosion);
                
                setTimeout(() => explosion.remove(), 2000);
            }, i * 100);
        }
    }

    // DEFEAT EFFECTS - DRAMATIC! 💀
    createDefeatEffect() {
        if (!this.effectsEnabled) return;

        document.body.style.filter = 'hue-rotate(180deg) saturate(0.3)';
        setTimeout(() => {
            document.body.style.filter = '';
        }, 3000);
        
        // Add shaking effect
        document.body.style.animation = 'defeat-shake 0.5s ease-in-out 3';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1500);
    }

    // MATCH COUNTDOWN WITH EPIC VISUALS! ⏰💥
    startEpicCountdown(seconds, callback) {
        if (!this.effectsEnabled) {
            if (callback) callback();
            return;
        }

        let count = seconds;
        const countdownEl = document.createElement('div');
        countdownEl.className = 'epic-countdown';
        countdownEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 8rem;
            font-weight: 900;
            color: var(--arena-red);
            text-shadow: 
                0 0 30px var(--arena-red),
                0 0 60px var(--arena-electric),
                0 0 90px var(--primary-orange);
            z-index: 10000;
            animation: countdown-pulse 1s infinite;
            pointer-events: none;
        `;
        document.body.appendChild(countdownEl);
        
        const interval = setInterval(() => {
            countdownEl.textContent = count;
            
            if (count <= 3) {
                countdownEl.style.color = 'var(--arena-electric)';
                countdownEl.style.animation = 'countdown-critical 0.5s infinite';
                document.body.style.background = count % 2 ? 
                    'radial-gradient(circle, rgba(255,0,48,0.1) 0%, var(--bg-dark) 100%)' : '';
            }
            
            if (count === 0) {
                countdownEl.textContent = 'FIGHT! ⚔️';
                countdownEl.style.color = 'var(--primary-green)';
                countdownEl.style.animation = 'countdown-start 1s ease-out';
                
                setTimeout(() => {
                    countdownEl.remove();
                    document.body.style.background = '';
                    if (callback) callback();
                }, 1000);
                
                clearInterval(interval);
                return;
            }
            
            count--;
        }, 1000);
    }

    // Code submission effects
    createSubmissionEffect(isSuccess) {
        if (!this.effectsEnabled) return;

        const effect = document.createElement('div');
        effect.textContent = isSuccess ? '✅' : '❌';
        effect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4rem;
            animation: submission-feedback 1s ease-out forwards;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1000);
    }

    // Timer warning effects
    createTimerWarning(timeLeft) {
        if (!this.effectsEnabled) return;
        
        if (timeLeft <= 10) {
            document.body.style.animation = 'timer-critical 0.5s ease-in-out';
            setTimeout(() => {
                document.body.style.animation = '';
            }, 500);
        }
    }

    // Match found celebration
    createMatchFoundEffect() {
        if (!this.effectsEnabled) return;

        const celebration = document.createElement('div');
        celebration.textContent = '⚔️ MATCH FOUND! ⚔️';
        celebration.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            font-weight: bold;
            color: var(--arena-accent);
            text-shadow: 0 0 20px var(--arena-accent);
            animation: match-found-pulse 2s ease-out forwards;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(celebration);
        
        setTimeout(() => celebration.remove(), 2000);
    }

    // Question transition effect
    createQuestionTransition(questionNumber) {
        if (!this.effectsEnabled) return;

        const transition = document.createElement('div');
        transition.textContent = `Question ${questionNumber}`;
        transition.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--text-light);
            animation: question-transition 1.5s ease-out forwards;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(transition);
        
        setTimeout(() => transition.remove(), 1500);
    }

    // Disable/Enable effects
    toggleEffects(enabled) {
        this.effectsEnabled = enabled;
    }

    // Screen flash effect for notifications
    flashScreen(color = 'rgba(255, 255, 255, 0.1)') {
        if (!this.effectsEnabled) return;

        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${color};
            animation: screen-flash 0.3s ease-out;
            z-index: 9998;
            pointer-events: none;
        `;
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 300);
    }
}

window.ArenaEffects = ArenaEffects;
