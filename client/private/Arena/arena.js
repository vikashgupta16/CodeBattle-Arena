class Arena {
    constructor() {
        this.socket = null;
        this.currentMatch = null;
        this.currentUser = null;
        this.codeEditor = null;
        this.currentLanguage = 'javascript';
        this.questionTimer = null;
        this.isInMatch = false;
        
        // Initialize Clerk first, then the Arena
        this.initClerk();
    }

    async initClerk() {
        console.log('Initializing Clerk...');
        
        // Wait for Clerk to be available
        if (typeof Clerk !== 'undefined') {
            try {
                await Clerk.load();
                console.log('Clerk initialized successfully');
                this.init();
            } catch (error) {
                console.error('Failed to initialize Clerk:', error);
                this.redirectToSignIn();
            }
        } else {
            // If Clerk is not available, wait and try again
            setTimeout(() => this.initClerk(), 100);
        }
    }

    async init() {
        console.log('Initializing Arena...');
        
        // Get user info from Clerk
        try {
            this.currentUser = await this.getCurrentUser();
            console.log('Current user:', this.currentUser);
            
            if (!this.currentUser) {
                console.log('No user found, redirecting to sign-in...');
                this.redirectToSignIn();
                return;
            }
        } catch (error) {
            console.error('Error getting current user:', error);
            this.redirectToSignIn();
            return;
        }

        // Initialize Socket.IO
        this.initSocket();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup Monaco Editor
        this.setupCodeEditor();
        
        // Load initial data
        await this.loadArenaStats();
        await this.loadPlayerStats();
        
        console.log('Arena initialized for user:', this.currentUser.username);
    }

    async getCurrentUser() {
        try {
            console.log('Getting current user from Clerk...');
            
            // Check if user is signed in with Clerk
            if (Clerk.user) {
                console.log('Clerk user found:', Clerk.user);
                
                // Now fetch additional user data from our API
                console.log('Fetching user data from /api/userdata...');
                const response = await fetch('/api/userdata');
                console.log('Response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('User data received:', data);
                    return data;
                } else {
                    console.log('Failed to fetch user data, status:', response.status);
                    return null;
                }
            } else {
                console.log('No Clerk user found');
                return null;
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    redirectToSignIn() {
        console.log('Redirecting to sign-in page...');
        window.location.href = '../../public/Accounts/signin.html';
    }

    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to Arena server');
            this.showNotification('Connected to Arena!', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from Arena server');
            this.showNotification('Disconnected from Arena', 'error');
        });

        // Arena events
        this.socket.on('arena:queue-joined', (data) => {
            this.handleQueueJoined(data);
        });

        this.socket.on('arena:match-found', (data) => {
            this.handleMatchFound(data);
        });

        this.socket.on('arena:question-start', (data) => {
            this.handleQuestionStart(data);
        });

        this.socket.on('arena:time-update', (data) => {
            this.handleTimeUpdate(data);
        });

        this.socket.on('arena:submission-result', (data) => {
            this.handleSubmissionResult(data);
        });

        this.socket.on('arena:match-update', (data) => {
            this.handleMatchUpdate(data);
        });

        this.socket.on('arena:match-end', (data) => {
            this.handleMatchEnd(data);
        });

        this.socket.on('arena:test-result', (data) => {
            this.handleTestResult(data);
        });

        this.socket.on('arena:error', (data) => {
            this.showNotification(data.message, 'error');
        });
    }

    setupEventListeners() {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                this.joinQueue(difficulty);
            });
        });

        // Queue actions
        document.getElementById('leaveQueueBtn')?.addEventListener('click', () => {
            this.leaveQueue();
        });

        // Match actions
        document.getElementById('readyBtn')?.addEventListener('click', () => {
            this.markReady();
        });

        // Code actions
        document.getElementById('runTestBtn')?.addEventListener('click', () => {
            this.runTest();
        });

        document.getElementById('submitBtn')?.addEventListener('click', () => {
            this.submitSolution();
        });

        // Language selection
        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
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
            this.showScreen('arenaMenu');
        });

        document.getElementById('backToArenaBtn')?.addEventListener('click', () => {
            this.showScreen('arenaMenu');
        });

        // Modal close on outside click
        document.getElementById('leaderboardModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideLeaderboard();
            }
        });
    }

    setupCodeEditor() {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' } });
        
        require(['vs/editor/editor.main'], () => {
            this.codeEditor = monaco.editor.create(document.getElementById('codeEditor'), {
                value: this.getDefaultCode('javascript'),
                language: 'javascript',
                theme: 'vs-dark',
                fontSize: 14,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false
            });
        });
    }

    getDefaultCode(language) {
        const templates = {
            javascript: `function solution() {
    // Your code here
    
}`,
            python: `def solution():
    # Your code here
    pass`,
            'c++': `#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
            java: `public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`
        };
        
        return templates[language] || templates.javascript;
    }

    changeLanguage(language) {
        this.currentLanguage = language;
        if (this.codeEditor) {
            const currentCode = this.codeEditor.getValue();
            // Only change if it's still the default template
            if (this.isDefaultTemplate(currentCode)) {
                this.codeEditor.setValue(this.getDefaultCode(language));
            }
            monaco.editor.setModelLanguage(this.codeEditor.getModel(), language);
        }
    }

    isDefaultTemplate(code) {
        const trimmed = code.trim();
        return trimmed.includes('Your code here') || trimmed.length < 50;
    }

    async loadArenaStats() {
        try {
            const response = await fetch('/api/arena/stats');
            if (response.ok) {
                const { stats } = await response.json();
                document.getElementById('onlineUsers').textContent = stats.onlineUsers;
                document.getElementById('activeMatches').textContent = stats.activeMatches;
                document.getElementById('totalMatches').textContent = stats.totalMatches;
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
                document.getElementById('playerMatches').textContent = stats.totalMatches;
                document.getElementById('playerWins').textContent = stats.wins;
                document.getElementById('playerWinRate').textContent = `${stats.winRate.toFixed(1)}%`;
                document.getElementById('playerStreak').textContent = stats.currentStreak;
            }
        } catch (error) {
            console.error('Failed to load player stats:', error);
        }
    }

    joinQueue(difficulty) {
        this.socket.emit('arena:join-queue', {
            userId: this.currentUser.userId,
            username: this.currentUser.username,
            difficulty: difficulty
        });
        
        this.showScreen('queueScreen');
        document.getElementById('selectedDifficulty').textContent = difficulty;
        document.getElementById('selectedDifficulty').className = `difficulty-badge ${difficulty}`;
    }

    leaveQueue() {
        this.socket.emit('arena:leave-queue');
        this.showScreen('arenaMenu');
    }

    handleQueueJoined(data) {
        document.getElementById('queuePosition').textContent = data.position;
        const estimatedWait = data.position * 30; // Rough estimate
        document.getElementById('estimatedWait').textContent = `${estimatedWait}s`;
    }

    handleMatchFound(matchData) {
        this.currentMatch = matchData;
        this.showScreen('matchFoundScreen');
        
        // Display player information
        document.getElementById('player1Name').textContent = 'You';
        document.getElementById('player1Difficulty').textContent = matchData.player.selectedDifficulty;
        document.getElementById('player1Difficulty').className = `difficulty-badge ${matchData.player.selectedDifficulty}`;
        
        document.getElementById('player2Name').textContent = matchData.opponent.username;
        document.getElementById('player2Difficulty').textContent = matchData.opponent.selectedDifficulty;
        document.getElementById('player2Difficulty').className = `difficulty-badge ${matchData.opponent.selectedDifficulty}`;
        
        // Start countdown
        this.startReadyCountdown();
    }

    startReadyCountdown() {
        let countdown = 5;
        const timer = document.getElementById('readyTimer');
        
        const interval = setInterval(() => {
            timer.textContent = countdown;
            countdown--;
            
            if (countdown < 0) {
                clearInterval(interval);
                this.markReady();
            }
        }, 1000);
    }

    markReady() {
        this.socket.emit('arena:ready', {
            matchId: this.currentMatch.matchId
        });
        
        this.showNotification('Waiting for opponent...', 'info');
    }

    handleQuestionStart(data) {
        this.showScreen('matchScreen');
        this.isInMatch = true;
        
        // Update question info
        document.getElementById('currentQuestionNum').textContent = data.questionIndex + 1;
        document.getElementById('problemTitle').textContent = data.problem.title;
        document.getElementById('problemDifficulty').textContent = data.problem.difficulty;
        document.getElementById('problemDifficulty').className = `difficulty-badge ${data.problem.difficulty}`;
        
        // Update problem content
        document.getElementById('problemDescription').innerHTML = this.formatProblemDescription(data.problem.description);
        document.getElementById('problemExamples').innerHTML = this.formatExamples(data.problem.examples);
        document.getElementById('problemConstraints').innerHTML = data.problem.constraints || 'No specific constraints.';
        
        // Reset code editor
        if (this.codeEditor) {
            this.codeEditor.setValue(this.getDefaultCode(this.currentLanguage));
        }
        
        // Start timer
        this.startQuestionTimer(data.timeRemaining);
        
        // Update player names and scores
        document.getElementById('playerNameMatch').textContent = this.currentMatch.player.username;
        document.getElementById('opponentNameMatch').textContent = this.currentMatch.opponent.username;
        
        this.showNotification(`Question ${data.questionIndex + 1} started!`, 'info');
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

    startQuestionTimer(initialTime) {
        let timeRemaining = initialTime;
        const timerElement = document.getElementById('questionTimer');
        const progressElement = document.getElementById('timerProgress');
        
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
        }
        
        this.questionTimer = setInterval(() => {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Update progress bar
            const progress = (timeRemaining / initialTime) * 100;
            progressElement.style.width = `${progress}%`;
            
            // Change timer color based on time remaining
            timerElement.className = 'timer';
            if (timeRemaining <= 30) {
                timerElement.classList.add('danger');
            } else if (timeRemaining <= 60) {
                timerElement.classList.add('warning');
            }
            
            timeRemaining--;
            
            if (timeRemaining < 0) {
                clearInterval(this.questionTimer);
                this.showNotification("Time's up!", 'warning');
            }
        }, 1000);
    }

    handleTimeUpdate(data) {
        // Update timer if we're on the same question
        if (data.questionIndex === this.currentMatch?.currentQuestionIndex) {
            this.startQuestionTimer(data.timeRemaining);
        }
    }

    async runTest() {
        if (!this.codeEditor) return;
        
        const code = this.codeEditor.getValue();
        if (!code.trim()) {
            this.showNotification('Please write some code first!', 'warning');
            return;
        }
        
        document.getElementById('runTestBtn').disabled = true;
        document.getElementById('runTestBtn').textContent = '⏳ Running...';
        
        this.socket.emit('arena:submit', {
            matchId: this.currentMatch.matchId,
            code: code,
            language: this.currentLanguage,
            isTest: true
        });
    }

    async submitSolution() {
        if (!this.codeEditor) return;
        
        const code = this.codeEditor.getValue();
        if (!code.trim()) {
            this.showNotification('Please write some code first!', 'warning');
            return;
        }
        
        // Confirm submission
        if (!confirm('Are you sure you want to submit your solution?')) {
            return;
        }
        
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').textContent = '⏳ Submitting...';
        
        this.socket.emit('arena:submit', {
            matchId: this.currentMatch.matchId,
            code: code,
            language: this.currentLanguage,
            isTest: false
        });
    }

    handleTestResult(data) {
        document.getElementById('runTestBtn').disabled = false;
        document.getElementById('runTestBtn').textContent = '▶️ Run & Test';
        
        this.displayResults(data, true);
    }

    handleSubmissionResult(data) {
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').textContent = '✅ Submit';
        
        if (data.userId === this.currentUser.userId) {
            this.displayResults(data.result, false);
            
            if (data.bonusAwarded) {
                this.showNotification('🎉 First to solve! +5 bonus points!', 'success');
            }
        } else {
            // Opponent submitted
            this.showNotification(`${this.currentMatch.opponent.username} submitted a solution!`, 'info');
        }
    }

    displayResults(result, isTest) {
        const resultsPanel = document.getElementById('resultsPanel');
        const resultsStatus = document.getElementById('resultsStatus');
        const resultsContent = document.getElementById('resultsContent');
        
        resultsPanel.style.display = 'block';
        
        // Update status
        resultsStatus.textContent = result.status || 'completed';
        resultsStatus.className = `status ${result.status}`;
        
        // Display results
        if (isTest) {
            // Test results (sample cases only)
            resultsContent.innerHTML = `
                <div class="test-summary">
                    <h5>Test Results (Sample Cases)</h5>
                    <p>${result.passedTests}/${result.totalTests} test cases passed</p>
                </div>
                ${result.results.map((test, index) => `
                    <div class="test-case ${test.passed ? 'passed' : 'failed'}">
                        <h5>Test Case ${index + 1} ${test.passed ? '✅' : '❌'}</h5>
                        <pre><strong>Input:</strong> ${test.input}</pre>
                        <pre><strong>Expected:</strong> ${test.expectedOutput}</pre>
                        <pre><strong>Your Output:</strong> ${test.actualOutput}</pre>
                        ${test.errorMessage ? `<pre><strong>Error:</strong> ${test.errorMessage}</pre>` : ''}
                    </div>
                `).join('')}
            `;
        } else {
            // Submission results
            resultsContent.innerHTML = `
                <div class="submission-summary">
                    <h5>Submission Results</h5>
                    <p>Score: ${result.score}%</p>
                    <p>${result.testCasesPassed}/${result.totalTestCases} test cases passed</p>
                    <p><strong>${result.feedback}</strong></p>
                </div>
            `;
        }
    }

    handleMatchUpdate(matchData) {
        this.currentMatch = matchData;
        
        // Update scores
        document.getElementById('playerScore').textContent = matchData.player.score;
        document.getElementById('opponentScore').textContent = matchData.opponent.score;
    }

    handleMatchEnd(data) {
        this.isInMatch = false;
        
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
        }
        
        this.showScreen('matchEndScreen');
        
        // Determine result
        const isWinner = data.winner === this.currentUser.userId;
        const isDraw = !data.winner;
        
        if (isWinner) {
            document.getElementById('resultTitle').textContent = '🎉 Victory!';
            document.getElementById('resultIcon').textContent = '🏆';
        } else if (isDraw) {
            document.getElementById('resultTitle').textContent = '🤝 Draw!';
            document.getElementById('resultIcon').textContent = '🤝';
        } else {
            document.getElementById('resultTitle').textContent = '😔 Defeat';
            document.getElementById('resultIcon').textContent = '😔';
        }
        
        // Update final scores
        document.getElementById('finalPlayerName').textContent = 'You';
        document.getElementById('finalPlayerScore').textContent = data.player1.score;
        document.getElementById('finalPlayerQuestions').textContent = data.player1.questionsCompleted;
        document.getElementById('finalPlayerBonus').textContent = data.player1.bonusPoints;
        
        document.getElementById('finalOpponentName').textContent = data.player2.username;
        document.getElementById('finalOpponentScore').textContent = data.player2.score;
        document.getElementById('finalOpponentQuestions').textContent = data.player2.questionsCompleted;
        document.getElementById('finalOpponentBonus').textContent = data.player2.bonusPoints;
        
        // Update match duration
        const duration = Math.floor(data.totalDuration / 60);
        const seconds = data.totalDuration % 60;
        document.getElementById('matchDuration').textContent = `${duration}:${seconds.toString().padStart(2, '0')}`;
        
        // Reload stats
        this.loadPlayerStats();
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

    showScreen(screenId) {
        document.querySelectorAll('.arena-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
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
}

// ARENA ENTRANCE EFFECTS - MAXIMUM INTENSITY! 🔥⚡
function createArenaEntrance() {
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
function createVictoryExplosion() {
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
function createDefeatEffect() {
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
function startEpicCountdown(seconds, callback) {
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

// Initialize Arena when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.arena = new Arena();
    createArenaEntrance();
});
