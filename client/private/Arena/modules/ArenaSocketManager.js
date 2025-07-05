/**
 * ArenaSocket        this.socket.on('connect', () => {
            this.arena.showNotification('Connected to Arena server', 'success');
        });

        this.socket.on('disconnect', () => {
            this.arena.showNotification('Disconnected from Arena server', 'error');
        });s - WebSocket connection and event handling
 */

class ArenaSocketManager {
    constructor() {
        this.socket = null;
        this.arena = null;
    }

    init(arenaInstance) {
        this.arena = arenaInstance;
        this.socket = io();
        this.setupSocketEvents();
        return this.socket;
    }

    setupSocketEvents() {
        // Connection events
        this.socket.on('connect', () => {
            this.arena.showNotification('Connected to Arena!', 'success');
        });

        this.socket.on('disconnect', () => {
            this.arena.showNotification('Disconnected from Arena server', 'error');
        });

        // Arena-specific events
        this.socket.on('arena:queue-joined', (data) => {
            this.arena.matchManager.handleQueueJoined(data);
        });

        this.socket.on('arena:match-found', (data) => {
            this.arena.matchManager.handleMatchFound(data, this.arena);
        });

        this.socket.on('arena:waiting-for-opponent', (data) => {
            this.arena.showNotification(data.message, 'info');
        });

        this.socket.on('arena:question-start', (data) => {
            this.arena.matchManager.handleQuestionStart(data, this.arena);
        });

        this.socket.on('arena:time-update', (data) => {
            this.arena.matchManager.handleTimeUpdate(data, this.arena);
        });

        this.socket.on('arena:submission-result', (data) => {
            this.arena.matchManager.handleSubmissionResult(data, this.arena);
        });

        this.socket.on('arena:match-update', (data) => {
            this.arena.matchManager.handleMatchUpdate(data, this.arena);
        });

        this.socket.on('arena:match-end', (data) => {
            this.arena.matchManager.handleMatchEnd(data, this.arena);
        });

        this.socket.on('arena:test-result', (data) => {
            this.arena.codeManager.handleTestResult(data);
        });

        this.socket.on('arena:error', (data) => {
            this.arena.showNotification(data.message, 'error');
        });

        // New independent progression events
        this.socket.on('arena:question-timeout', (data) => {
            this.arena.matchManager.handleQuestionTimeout(data, this.arena);
        });

        this.socket.on('arena:player-complete', (data) => {
            this.arena.matchManager.handlePlayerComplete(data, this.arena);
        });

        this.socket.on('arena:player-stats-update', (data) => {
            this.arena.uiManager.updatePlayerStats(data.stats);
        });

        this.socket.on('arena:stats-update', (data) => {
            this.arena.uiManager.updateArenaStats(data.stats);
        });
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }
}

window.ArenaSocketManager = ArenaSocketManager;
