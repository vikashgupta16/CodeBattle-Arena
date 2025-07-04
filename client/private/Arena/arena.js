/**
 * Arena.js - Main entry point for the Arena application
 * Uses modular architecture for maintainability
 */

// Global arena instance
let arenaInstance = null;

// Initialize Arena when page loads (exactly like coder.js)
window.addEventListener('load', async () => {
    if (typeof Clerk !== 'undefined') {
        try {
            await Clerk.load();
            
            // Initialize Arena
            arenaInstance = new ArenaCore();
            await arenaInstance.initClerk();
            
            // Set global reference for compatibility
            window.arena = arenaInstance;
            
            // Create entrance effects
            if (arenaInstance.effects) {
                arenaInstance.effects.createArenaEntrance();
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Arena:', error);
            // Just log the error, don't redirect (like coder.js)
        }
    } else {
        console.warn('Clerk not available yet, Arena may have limited functionality');
        // Still try to initialize Arena for basic functionality
        arenaInstance = new ArenaCore();
    }
});

// Utility functions for UI interactions
function joinQueue(difficulty) {
    if (arenaInstance) {
        arenaInstance.joinQueue(difficulty);
    }
}

function leaveQueue() {
    if (arenaInstance) {
        arenaInstance.leaveQueue();
    }
}

function runTest() {
    if (arenaInstance) {
        arenaInstance.runTest();
    }
}

function submitSolution() {
    if (arenaInstance) {
        arenaInstance.submitSolution();
    }
}

function changeLanguage(language) {
    if (arenaInstance) {
        arenaInstance.changeLanguage(language);
    }
}

function showScreen(screenId) {
    if (arenaInstance) {
        arenaInstance.showScreen(screenId);
    }
}

// Utility functions for backward compatibility and additional features
window.ArenaUtils = {
    // Start epic countdown (can be called from other modules)
    startEpicCountdown: (seconds, callback) => {
        if (arenaInstance) {
            arenaInstance.effects.startEpicCountdown(seconds, callback);
        }
    },
    
    // Create victory explosion
    createVictoryExplosion: () => {
        if (arenaInstance) {
            arenaInstance.effects.createVictoryExplosion();
        }
    },
    
    // Create defeat effect
    createDefeatEffect: () => {
        if (arenaInstance) {
            arenaInstance.effects.createDefeatEffect();
        }
    },
    
    // Get current match status
    getCurrentMatch: () => {
        return arenaInstance ? arenaInstance.matchManager.getCurrentMatch() : null;
    },
    
    // Check if currently in match
    isInMatch: () => {
        return arenaInstance ? arenaInstance.matchManager.isCurrentlyInMatch() : false;
    },
    
    // Toggle effects
    toggleEffects: (enabled) => {
        if (arenaInstance) {
            arenaInstance.effects.toggleEffects(enabled);
        }
    }
};

// Export for global access
window.Arena = {
    joinQueue,
    leaveQueue,
    runTest,
    submitSolution,
    changeLanguage,
    showScreen,
    getInstance: () => arenaInstance
};

// Export the main arena instance for debugging and external access
window.getArenaInstance = () => arenaInstance;
