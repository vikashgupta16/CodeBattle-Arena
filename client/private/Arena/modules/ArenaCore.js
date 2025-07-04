/**
 * ArenaCore.js - Main Arena class handling initialization and core functionality
 */

class ArenaCore {
    constructor() {
        this.socket = null;
        this.currentMatch = null;
        this.currentUser = null;
        this.codeEditor = null;
        this.currentLanguage = 'javascript';
        this.questionTimer = null;
        this.isInMatch = false;
        
        // Initialize other modules
        this.auth = new ArenaAuth();
        this.socketManager = new ArenaSocketManager();
        this.uiManager = new ArenaUIManager();
        this.matchManager = new ArenaMatchManager(this); // Pass this reference
        this.codeManager = new ArenaCodeManager();
        this.effects = new ArenaEffects();
    }

    async initClerk() {
        if (typeof Clerk !== 'undefined') {
            try {
                await Clerk.load();
                await this.init();
            } catch (error) {
                console.error('❌ Failed to initialize Clerk in ArenaCore:', error);
                // Don't redirect immediately, try to continue with limited functionality
                await this.init();
            }
        } else {
            console.warn('Clerk not available, continuing with limited functionality');
            // Still try to initialize basic functionality
            await this.init();
        }
    }

    async init() {
        try {
            // Initialize user authentication (but don't fail if user is not found)
            this.currentUser = await this.auth.getCurrentUser();
            
            if (!this.currentUser) {
                // Instead of redirecting immediately, show a sign-in prompt in the UI
                this.showSignInPrompt();
                return;
            }

            // Initialize all components
            await this.initializeComponents();
            
        } catch (error) {
            console.error('❌ Error during arena initialization:', error);
            // Don't redirect immediately, show error state
            this.showErrorState(error);
        }
    }

    showSignInPrompt() {
        // Show a sign-in prompt in the UI instead of redirecting immediately
        const arenaHeader = document.querySelector('.arena-header');
        if (arenaHeader) {
            arenaHeader.innerHTML = `
                <h1>⚔️ CodeBattle Arena</h1>
                <p>Please sign in to access the Arena!</p>
                <button class="action-btn primary" onclick="window.location.href='../../public/Accounts/signin.html'">
                    🔐 Sign In
                </button>
            `;
        }
    }

    showErrorState(error) {
        // Show an error state in the UI
        const arenaHeader = document.querySelector('.arena-header');
        if (arenaHeader) {
            arenaHeader.innerHTML = `
                <h1>⚔️ CodeBattle Arena</h1>
                <p>There was an error loading the Arena. Please try again.</p>
                <button class="action-btn primary" onclick="window.location.reload()">
                    🔄 Retry
                </button>
            `;
        }
        console.error('Arena error state:', error);
    }

    async initializeComponents() {
        try {
            // Initialize Socket.IO
            this.socket = this.socketManager.init(this);
            
            // Setup UI components
            this.uiManager.setupEventListeners(this);
            
            // Setup Code Editor (only if we're in match screen)
            const codeEditorElement = document.getElementById('codeEditor');
            if (codeEditorElement) {
                try {
                    this.codeEditor = await this.codeManager.setupCodeEditor();
                } catch (editorError) {
                    console.warn('⚠️ Code editor failed to initialize:', editorError);
                    // Continue without editor for now
                }
            }
            
            // Load initial data
            await Promise.all([
                this.loadArenaStats().catch(err => console.warn('Failed to load arena stats:', err)),
                this.loadPlayerStats().catch(err => console.warn('Failed to load player stats:', err))
            ]);
            
        } catch (error) {
            console.error('❌ Error initializing components:', error);
            // Don't throw, just log the error
        }
    }

    async loadArenaStats() {
        try {
            const response = await fetch('/api/arena/stats');
            if (response.ok) {
                const { stats } = await response.json();
                this.uiManager.updateArenaStats(stats);
            }
        } catch (error) {
            console.error('Failed to load arena stats:', error);
        }
    }

    async loadPlayerStats() {
        try {
            const response = await fetch(`/api/arena/player-stats/${this.currentUser.userId}`);
            if (response.ok) {
                const { stats } = await response.json();
                this.uiManager.updatePlayerStats(stats);
            }
        } catch (error) {
            console.error('Failed to load player stats:', error);
        }
    }

    // Delegate methods to appropriate managers
    joinQueue(difficulty) {
        if (!this.currentUser) {
            console.error('❌ [ArenaCore] Cannot join queue: no current user');
            this.showNotification('Please sign in first!', 'error');
            return;
        }
        
        if (!this.socket || !this.socket.connected) {
            console.error('❌ [ArenaCore] Cannot join queue: socket not connected');
            this.showNotification('Connection error. Please refresh the page.', 'error');
            return;
        }
        
        this.matchManager.joinQueue(this.socket, this.currentUser, difficulty);
    }

    leaveQueue() {
        this.matchManager.leaveQueue(this.socket);
    }

    async runTest() {
        await this.codeManager.runTest(this.socket, this.currentMatch, this.codeEditor, this.currentLanguage);
    }

    async submitSolution() {
        await this.codeManager.submitSolution(this.socket, this.currentMatch, this.codeEditor, this.currentLanguage);
    }

    changeLanguage(language) {
        this.currentLanguage = language;
        this.codeManager.changeLanguage(this.codeEditor, language);
    }

    showNotification(message, type = 'info') {
        this.uiManager.showNotification(message, type);
    }

    showScreen(screenId) {
        this.uiManager.showScreen(screenId);
    }
}

// Make ArenaCore globally available
window.ArenaCore = ArenaCore;
