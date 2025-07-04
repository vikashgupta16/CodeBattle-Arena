/**
 * ArenaMatchManager.js - Match logic and state management
 */

class ArenaMatchManager {
    constructor(arenaCore) {
        this.currentMatch = null;
        this.questionTimer = null;
        this.isInMatch = false;
        this.readyCountdownActive = false; // Prevent duplicate countdowns
        this.arena = arenaCore; // Store reference to ArenaCore instance
        
        // Server-synced timer properties
        this.serverTimeRemaining = 0;
        this.lastServerSync = 0;
    }

    joinQueue(socket, currentUser, difficulty) {
        const queueData = {
            userId: currentUser.userId,
            username: currentUser.username || currentUser.name,
            difficulty: difficulty
        };
        
        socket.emit('arena:join-queue', queueData);
        
        this.arena.showScreen('queueScreen');
        document.getElementById('selectedDifficulty').textContent = difficulty;
        document.getElementById('selectedDifficulty').className = `difficulty-badge ${difficulty}`;
    }

    leaveQueue(socket) {
        socket.emit('arena:leave-queue');
        this.arena.showScreen('arenaMenu');
    }

    handleQueueJoined(data) {
        this.arena.uiManager.updateQueueInfo(data);
    }

    handleMatchFound(matchData) {
        // Prevent duplicate match found handling
        if (this.readyCountdownActive) {
            return;
        }
        
        this.arena.currentMatch = matchData;
        this.currentMatch = matchData;
        
        this.arena.showScreen('matchFoundScreen');
        this.arena.uiManager.updateMatchInfo(matchData);
        
        // Start countdown
        this.startReadyCountdown();
    }

    startReadyCountdown() {
        if (this.readyCountdownActive) {
            return;
        }
        
        this.readyCountdownActive = true;
        let countdown = 5;
        const timer = document.getElementById('readyTimer');
        
        const interval = setInterval(() => {
            timer.textContent = countdown;
            countdown--;
            
            if (countdown < 0) {
                clearInterval(interval);
                this.readyCountdownActive = false;
                this.markReady(this.arena.socket, this.arena.currentMatch);
            }
        }, 1000);
    }

    markReady(socket, currentMatch) {
        socket.emit('arena:ready', {
            matchId: currentMatch.matchId
        });
        
        this.arena.showNotification('Ready! Waiting for opponent...', 'info');
    }

    handleQuestionStart(data, arena) {
        arena.showScreen('matchScreen');
        this.isInMatch = true;
        arena.isInMatch = true;
        
        arena.uiManager.updateQuestionInfo(data);
        
        // Reset code editor with default template for current language
        if (arena.codeEditor) {
            arena.codeEditor.setValue(arena.codeManager.getDefaultCode(arena.currentLanguage));
            arena.codeEditor.clearSelection();
        }
        
        // Reset button states for new question
        this.resetButtonStates();
        
        // Initialize timer display (server will send updates)
        this.initializeTimerDisplay(data.timeRemaining);
        
        // Update player names and scores
        document.getElementById('playerNameMatch').textContent = arena.currentMatch.player.username;
        document.getElementById('opponentNameMatch').textContent = arena.currentMatch.opponent.username;
        
        // Initialize scores in match header
        document.getElementById('playerScore').textContent = arena.currentMatch.player.score || 0;
        document.getElementById('opponentScore').textContent = arena.currentMatch.opponent.score || 0;
        
        arena.showNotification(`Question ${data.questionIndex + 1} started!`, 'info');
    }

    resetButtonStates() {
        // Reset button states for new question
        const runBtn = document.getElementById('runTestBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = '▶️ Run & Test';
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Submit';
        }
    }

    initializeTimerDisplay(timeRemaining) {
        // Clear any existing client-side timer
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
        
        // Initialize server-synced client timer
        this.serverTimeRemaining = timeRemaining;
        this.lastServerSync = Date.now();
        this.startClientTimer();
    }

    startClientTimer() {
        const timerElement = document.getElementById('questionTimer');
        const progressElement = document.getElementById('timerProgress');
        
        if (!timerElement || !progressElement) return;
        
        // Update display immediately
        this.updateTimerDisplay();
        
        // Start client-side timer that updates every second
        this.questionTimer = setInterval(() => {
            // Calculate time based on last server sync + elapsed time
            const elapsedSinceSync = Math.floor((Date.now() - this.lastServerSync) / 1000);
            const currentTime = Math.max(0, this.serverTimeRemaining - elapsedSinceSync);
            
            this.updateTimerDisplay(currentTime);
            
            // Stop timer if time runs out
            if (currentTime <= 0) {
                clearInterval(this.questionTimer);
                this.questionTimer = null;
            }
        }, 1000);
    }

    updateTimerDisplay(timeRemaining = null) {
        const timerElement = document.getElementById('questionTimer');
        const progressElement = document.getElementById('timerProgress');
        
        if (!timerElement || !progressElement) return;
        
        // Use provided time or calculate from server sync
        let currentTime = timeRemaining;
        if (currentTime === null) {
            const elapsedSinceSync = Math.floor((Date.now() - this.lastServerSync) / 1000);
            currentTime = Math.max(0, this.serverTimeRemaining - elapsedSinceSync);
        }
        
        const minutes = Math.floor(currentTime / 60);
        const seconds = currentTime % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Calculate progress (assuming 5 minutes = 300 seconds max)
        const maxTime = 300; // 5 minutes
        const progress = (currentTime / maxTime) * 100;
        progressElement.style.width = `${Math.max(0, progress)}%`;
        
        // Update timer color based on time remaining
        timerElement.className = 'timer';
        if (currentTime <= 30) {
            timerElement.classList.add('danger');
        } else if (currentTime <= 60) {
            timerElement.classList.add('warning');
        }
    }

    handleTimeUpdate(data, arena) {
        // Sync with server time (this prevents client drift)
        this.serverTimeRemaining = data.timeRemaining;
        this.lastServerSync = Date.now();
        
        // Force update display with server time
        this.updateTimerDisplay(data.timeRemaining);
        
        // Update current player's progress if provided
        if (data.playerProgress) {
            this.updatePlayerProgress(data.playerProgress, arena);
        }
        
        // Update both players' scores if match data is provided
        if (data.matchData && arena.currentUser) {
            const currentUserId = arena.currentUser.userId;
            const isPlayer1 = data.matchData.player1.userId === currentUserId;
            
            if (isPlayer1) {
                // Current user is player1
                document.getElementById('playerScore').textContent = data.matchData.player1.score || 0;
                document.getElementById('opponentScore').textContent = data.matchData.player2.score || 0;
            } else {
                // Current user is player2
                document.getElementById('playerScore').textContent = data.matchData.player2.score || 0;
                document.getElementById('opponentScore').textContent = data.matchData.player1.score || 0;
            }
        }
        
        // If client timer isn't running but should be, restart it
        if (!this.questionTimer && data.timeRemaining > 0) {
            this.startClientTimer();
        }
    }

    updatePlayerProgress(progress, arena) {
        // Update score display in progress section
        const scoreElement = document.getElementById('currentScore');
        if (scoreElement) {
            scoreElement.textContent = progress.score || 0;
        }
        
        // Update questions completed
        const questionsElement = document.getElementById('questionsCompleted');
        if (questionsElement) {
            questionsElement.textContent = progress.questionsCompleted || 0;
        }
        
        // Update current question indicator
        const questionIndexElement = document.getElementById('currentQuestionIndex');
        if (questionIndexElement) {
            questionIndexElement.textContent = (progress.currentQuestionIndex || 0) + 1;
        }
        
        // Update player score in match header (real-time update)
        const playerScoreElement = document.getElementById('playerScore');
        if (playerScoreElement) {
            playerScoreElement.textContent = progress.score || 0;
        }
    }

    handleSubmissionResult(data, arena) {
        // Update player progress if provided (including updated score)
        if (data.playerProgress) {
            this.updatePlayerProgress(data.playerProgress, arena);
        }
        
        // Let the code manager handle the submission result (this resets button state)
        arena.codeManager.handleSubmissionResult(data);
        
        // Show additional notifications if needed
        if (data.bonusAwarded) {
            arena.showNotification('🎉 First to solve! +5 bonus points!', 'success');
        }
    }

    handleMatchUpdate(matchData, arena) {
        arena.currentMatch = matchData;
        this.currentMatch = matchData;
        
        arena.uiManager.updateScores(matchData);
    }

    handleMatchEnd(data, arena) {
        this.isInMatch = false;
        arena.isInMatch = false;
        
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
        
        arena.showScreen('matchEndScreen');
        arena.uiManager.updateMatchResults(data);
        
        // Determine result for current player
        const currentUserId = arena.currentUser.userId;
        const isWinner = data.winner === currentUserId;
        const isDraw = data.isDraw || !data.winner;
        
        // Trigger appropriate effects and notifications
        if (isDraw) {
            arena.showNotification('🤝 Match ended in a draw!', 'info');
            // Could add draw effect here
        } else if (isWinner) {
            arena.showNotification('🎉 Congratulations! You won!', 'success');
            arena.effects.createVictoryExplosion();
        } else {
            arena.showNotification('😔 Better luck next time!', 'warning');
            arena.effects.createDefeatEffect();
        }
        
        // Reload stats
        arena.loadPlayerStats();
    }

    handleQuestionTimeout(data, arena) {
        // Show timeout notification
        arena.showNotification(data.message || 'Time\'s up! Moving to next question...', 'warning');
        
        // Disable submit and test buttons temporarily
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('runTestBtn').disabled = true;
        
        // Auto-advance notification
        setTimeout(() => {
            arena.showNotification('Loading next question...', 'info');
        }, 1000);
    }

    handlePlayerComplete(data, arena) {
        // Show completion screen
        arena.showScreen('matchCompleteScreen');
        
        // Update completion info
        document.getElementById('finalScore').textContent = data.finalScore || 0;
        document.getElementById('questionsCompleted').textContent = data.questionsCompleted || 0;
        
        // Show completion notification
        arena.showNotification(data.message || 'Congratulations! You completed all questions!', 'success');
        
        this.isInMatch = false;
        arena.isInMatch = false;
    }

    getCurrentMatch() {
        return this.currentMatch;
    }

    isCurrentlyInMatch() {
        return this.isInMatch;
    }

    cleanup() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
        this.isInMatch = false;
        this.currentMatch = null;
    }
}

window.ArenaMatchManager = ArenaMatchManager;
