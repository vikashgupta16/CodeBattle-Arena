/**
 * ArenaUIManager.js - UI management and event handling
 */

class ArenaUIManager {
    constructor() {
        this.activeScreen = 'arenaMenu';
    }

    setupEventListeners(arena) {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                arena.joinQueue(difficulty);
            });
        });

        // Queue actions
        document.getElementById('leaveQueueBtn')?.addEventListener('click', () => {
            arena.leaveQueue();
        });

        // Match actions
        document.getElementById('readyBtn')?.addEventListener('click', () => {
            arena.matchManager.markReady(arena.socket, arena.currentMatch);
        });

        // Code actions
        document.getElementById('runTestBtn')?.addEventListener('click', () => {
            arena.runTest();
        });

        document.getElementById('submitBtn')?.addEventListener('click', () => {
            arena.submitSolution();
        });

        // Language selection
        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            arena.changeLanguage(e.target.value);
        });

        // Navigation
        document.getElementById('backToHomeBtn')?.addEventListener('click', () => {
            window.location.href = '/private/HomePage/codigo.html';
        });

        document.getElementById('viewLeaderboardBtn')?.addEventListener('click', () => {
            this.showLeaderboard();
        });

        document.getElementById('closeLeaderboardBtn')?.addEventListener('click', () => {
            this.hideLeaderboard();
        });

        document.getElementById('playAgainBtn')?.addEventListener('click', () => {
            this.showScreen('arenaMenu', arena);
        });

        document.getElementById('backToArenaBtn')?.addEventListener('click', () => {
            this.showScreen('arenaMenu', arena);
        });

        // Modal close on outside click
        document.getElementById('leaderboardModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideLeaderboard();
            }
        });
    }

    updateArenaStats(stats) {
        document.getElementById('onlineUsers').textContent = stats.onlineUsers;
        document.getElementById('activeMatches').textContent = stats.activeMatches;
        document.getElementById('totalMatches').textContent = stats.totalMatches;
    }

    updatePlayerStats(stats) {
        console.log('🎯 [ArenaUIManager] Updating player stats:', stats);
        document.getElementById('playerMatches').textContent = stats.totalMatches;
        document.getElementById('playerWins').textContent = stats.wins;
        document.getElementById('playerWinRate').textContent = `${stats.winRate.toFixed(1)}%`;
        document.getElementById('playerStreak').textContent = stats.currentStreak;
    }

    showScreen(screenId, arena = null) {
        document.querySelectorAll('.arena-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.activeScreen = screenId;
        
        // Refresh stats when returning to arena menu
        if (screenId === 'arenaMenu' && arena) {
            arena.loadPlayerStats().catch(err => console.warn('Failed to refresh player stats:', err));
            arena.loadArenaStats().catch(err => console.warn('Failed to refresh arena stats:', err));
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async showLeaderboard() {
        try {
            const response = await fetch('/api/arena/leaderboard');
            if (response.ok) {
                const { leaderboard } = await response.json();
                this.displayLeaderboard(leaderboard);
                document.getElementById('leaderboardModal').classList.add('active');
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.showNotification('Failed to load leaderboard', 'error');
        }
    }

    displayLeaderboard(leaderboard) {
        const list = document.getElementById('leaderboardList');
        
        list.innerHTML = leaderboard.map(player => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">#${player.rank}</div>
                <div class="leaderboard-player">
                    <h4>${player.username}</h4>
                    <p>${player.totalMatches} matches • ${player.currentStreak} streak</p>
                </div>
                <div class="leaderboard-stats">
                    <div class="win-rate">${player.winRate}%</div>
                    <div>${player.wins}W ${player.losses}L ${player.draws}D</div>
                </div>
            </div>
        `).join('');
    }

    hideLeaderboard() {
        document.getElementById('leaderboardModal').classList.remove('active');
    }

    updateQueueInfo(data) {
        document.getElementById('queuePosition').textContent = data.position;
        const estimatedWait = data.position * 30; // Rough estimate
        document.getElementById('estimatedWait').textContent = `${estimatedWait}s`;
    }

    updateMatchInfo(matchData) {
        // Display player information
        document.getElementById('player1Name').textContent = 'You';
        document.getElementById('player1Difficulty').textContent = matchData.player.selectedDifficulty;
        document.getElementById('player1Difficulty').className = `difficulty-badge ${matchData.player.selectedDifficulty}`;
        
        document.getElementById('player2Name').textContent = matchData.opponent.username;
        document.getElementById('player2Difficulty').textContent = matchData.opponent.selectedDifficulty;
        document.getElementById('player2Difficulty').className = `difficulty-badge ${matchData.opponent.selectedDifficulty}`;
    }

    updateQuestionInfo(data) {
        // Update question info
        document.getElementById('currentQuestionIndex').textContent = data.questionIndex + 1;
        document.getElementById('problemTitle').textContent = data.problem.title;
        document.getElementById('problemDifficulty').textContent = data.problem.difficulty;
        document.getElementById('problemDifficulty').className = `difficulty-badge ${data.problem.difficulty}`;
        
        // Update problem content
        document.getElementById('problemDescription').innerHTML = this.formatProblemDescription(data.problem.description);
        document.getElementById('problemExamples').innerHTML = this.formatExamples(data.problem.examples);
        document.getElementById('problemConstraints').innerHTML = data.problem.constraints || 'No specific constraints.';
    }

    updateScores(matchData) {
        document.getElementById('playerScore').textContent = matchData.player.score;
        document.getElementById('opponentScore').textContent = matchData.opponent.score;
    }

    updateMatchResults(data) {
        // Determine result for current user
        const currentUserId = window.arena?.currentUser?.userId;
        const isWinner = data.winner === currentUserId;
        const isDraw = data.isDraw || !data.winner;
        
        // Update result display
        if (isDraw) {
            document.getElementById('resultTitle').textContent = '🤝 Draw!';
            document.getElementById('resultIcon').textContent = '🤝';
        } else if (isWinner) {
            document.getElementById('resultTitle').textContent = '🎉 Victory!';
            document.getElementById('resultIcon').textContent = '🏆';
        } else {
            document.getElementById('resultTitle').textContent = '😔 Defeat';
            document.getElementById('resultIcon').textContent = '😔';
        }
        
        // Identify which player data belongs to current user
        let currentPlayer, opponent;
        if (data.player1.userId === currentUserId) {
            currentPlayer = data.player1;
            opponent = data.player2;
        } else {
            currentPlayer = data.player2;
            opponent = data.player1;
        }
        
        // Update final scores with correct player assignment
        document.getElementById('finalPlayerName').textContent = 'You';
        document.getElementById('finalPlayerScore').textContent = currentPlayer.score || 0;
        document.getElementById('finalPlayerQuestions').textContent = currentPlayer.questionsCompleted || 0;
        document.getElementById('finalPlayerBonus').textContent = currentPlayer.bonusPoints || 0;
        
        document.getElementById('finalOpponentName').textContent = opponent.username || 'Opponent';
        document.getElementById('finalOpponentScore').textContent = opponent.score || 0;
        document.getElementById('finalOpponentQuestions').textContent = opponent.questionsCompleted || 0;
        document.getElementById('finalOpponentBonus').textContent = opponent.bonusPoints || 0;
        
        // Update match duration
        const duration = Math.floor((data.totalDuration || 0) / 60);
        const seconds = (data.totalDuration || 0) % 60;
        document.getElementById('matchDuration').textContent = `${duration}:${seconds.toString().padStart(2, '0')}`;
    }

    formatProblemDescription(description) {
        return description.replace(/\n/g, '<br>');
    }

    formatExamples(examples) {
        if (!examples || examples.length === 0) {
            return 'No examples provided.';
        }
        
        return examples.map((example, index) => `
            <div class="example">
                <strong>Example ${index + 1}:</strong><br>
                <strong>Input:</strong> <code>${example.input}</code><br>
                <strong>Output:</strong> <code>${example.output}</code>
                ${example.explanation ? `<br><strong>Explanation:</strong> ${example.explanation}` : ''}
            </div>
        `).join('');
    }
}

window.ArenaUIManager = ArenaUIManager;
