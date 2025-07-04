import { Server } from 'socket.io';
import { ArenaDBHandler } from './arenaDatabase.js';
import { ProblemDBHandler } from './problemDatabase.js';

class ArenaSocketHandler {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "*",
                credentials: true
            }
        });

        this.arenaDB = new ArenaDBHandler();
        this.problemDB = new ProblemDBHandler();
        
        // Store active matches and player timers
        this.activeMatches = new Map();
        this.playerTimers = new Map(); // Independent timers per player
        this.questionTimers = new Map(); // Legacy timers (for cleanup)
        this.playerProgress = new Map(); // Track each player's current question
        this.playerReadyState = new Map(); // Track which players are ready for each match
        
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[Arena] User connected: ${socket.id}`);

            // Join arena queue
            socket.on('arena:join-queue', async (data) => {
                try {
                    console.log('🎯 [Arena] Join queue request:', data);
                    const { userId, username, difficulty } = data;
                    
                    if (!userId || !username || !difficulty) {
                        console.error('❌ [Arena] Missing required data:', { userId, username, difficulty });
                        socket.emit('arena:error', { message: 'Missing required data' });
                        return;
                    }

                    // Store user info in socket
                    socket.userId = userId;
                    socket.username = username;
                    console.log(`📝 [Arena] Stored user info in socket ${socket.id}: ${username} (${userId})`);

                    const result = await this.arenaDB.joinQueue(userId, username, difficulty);
                    console.log('🎮 [Arena] Queue result:', result);
                    
                    if (result.matched) {
                        console.log('🎉 [Arena] Match found! Creating match...');
                        // Match found - notify both players
                        await this.handleMatchCreated(result.match);
                    } else {
                        console.log(`⏳ [Arena] Added to queue at position ${result.queuePosition}`);
                        // Added to queue
                        socket.join(`queue:${difficulty}`);
                        socket.emit('arena:queue-joined', {
                            position: result.queuePosition,
                            difficulty
                        });
                    }
                    
                    // Broadcast updated arena stats
                    await this.broadcastArenaStats();
                } catch (error) {
                    console.error('[Arena] Join queue error:', error);
                    socket.emit('arena:error', { message: 'Failed to join queue' });
                }
            });

            // Leave arena queue
            socket.on('arena:leave-queue', async () => {
                try {
                    if (socket.userId) {
                        await this.arenaDB.leaveQueue(socket.userId);
                        socket.emit('arena:queue-left');
                        
                        // Broadcast updated arena stats
                        await this.broadcastArenaStats();
                    }
                } catch (error) {
                    console.error('[Arena] Leave queue error:', error);
                }
            });

            // Ready to start match
            socket.on('arena:ready', async (data) => {
                try {
                    console.log(`🎯 [Arena] Player ${socket.userId} (${socket.username}) marked ready for match ${data.matchId}`);
                    
                    const { matchId } = data;
                    
                    // Join match room
                    socket.join(`match:${matchId}`);
                    
                    // Track this player as ready
                    if (!this.playerReadyState.has(matchId)) {
                        this.playerReadyState.set(matchId, new Set());
                    }
                    
                    const readyPlayers = this.playerReadyState.get(matchId);
                    
                    // Check if this player is already marked as ready
                    if (readyPlayers.has(socket.userId)) {
                        console.log(`⚠️ [Arena] Player ${socket.userId} already marked ready for match ${matchId}, ignoring`);
                        return;
                    }
                    
                    readyPlayers.add(socket.userId);
                    console.log(`✅ [Arena] Player ${socket.userId} added to ready state for match ${matchId}`);
                    
                    // Check if both players are ready
                    console.log(`📊 [Arena] Ready players for match ${matchId}: ${readyPlayers.size}/2`);
                    
                    // Get match to know how many players should be ready
                    const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
                    if (!match) {
                        console.error(`❌ [Arena] Match ${matchId} not found`);
                        socket.emit('arena:error', { message: 'Match not found' });
                        return;
                    }
                    
                    // Start match only when both players are ready
                    if (readyPlayers.size >= 2) {
                        console.log(`🚀 [Arena] Both players ready! Starting match ${matchId}...`);
                        
                        // Update match status
                        const startedMatch = await this.arenaDB.startMatch(matchId);
                        
                        // Start the match for both players
                        await this.startMatchForPlayers(startedMatch);
                        
                        // Clean up ready state
                        this.playerReadyState.delete(matchId);
                    } else {
                        console.log(`⏳ [Arena] Waiting for other player to be ready (${readyPlayers.size}/2)`);
                        socket.emit('arena:waiting-for-opponent', {
                            message: 'Waiting for opponent to be ready...'
                        });
                    }
                } catch (error) {
                    console.error('[Arena] Ready error:', error);
                    socket.emit('arena:error', { message: 'Failed to start match' });
                }
            });

            // Submit solution
            socket.on('arena:submit', async (data) => {
                try {
                    const { matchId, code, language, isTest } = data;
                    
                    if (isTest) {
                        // Handle test run (Run & Test button)
                        await this.handleTestRun(socket, matchId, code, language);
                    } else {
                        // Handle final submission (Submit button)
                        await this.handleSubmission(socket, matchId, code, language);
                    }
                } catch (error) {
                    console.error('[Arena] Submit error:', error);
                    socket.emit('arena:error', { message: 'Submission failed' });
                }
            });

            // Get match status
            socket.on('arena:get-match', async (data) => {
                try {
                    const { matchId } = data;
                    const match = await this.arenaDB.getMatchForUser(matchId, socket.userId);
                    socket.emit('arena:match-update', match);
                } catch (error) {
                    console.error('[Arena] Get match error:', error);
                }
            });

            // Disconnect handling
            socket.on('disconnect', async () => {
                console.log(`[Arena] User disconnected: ${socket.id}`);
                
                if (socket.userId) {
                    // Remove from queue if still waiting
                    await this.arenaDB.leaveQueue(socket.userId);
                    
                    // Handle match abandonment if in active match
                    // (You might want to pause the match or mark as abandoned)
                }
            });
        });
    }

    // Handle match creation
    async handleMatchCreated(match) {
        try {
            console.log('🔍 [Arena] Looking for sockets for match:', {
                player1: match.player1.userId,
                player2: match.player2.userId,
                matchId: match.matchId
            });

            const player1Socket = this.findSocketByUserId(match.player1.userId);
            const player2Socket = this.findSocketByUserId(match.player2.userId);

            console.log('🔌 [Arena] Socket search results:', {
                player1Socket: player1Socket ? `Found (${player1Socket.id})` : 'Not found',
                player2Socket: player2Socket ? `Found (${player2Socket.id})` : 'Not found',
                totalSockets: this.io.sockets.sockets.size
            });

            if (player1Socket && player2Socket) {
                console.log('✅ [Arena] Both sockets found, setting up match...');

                // Remove from queue rooms
                player1Socket.leave(`queue:${match.player1.selectedDifficulty}`);
                player2Socket.leave(`queue:${match.player2.selectedDifficulty}`);

                // Join match room
                player1Socket.join(`match:${match.matchId}`);
                player2Socket.join(`match:${match.matchId}`);

                console.log(`🏠 [Arena] Players joined match room: match:${match.matchId}`);

                // Notify both players
                const matchData1 = await this.arenaDB.getMatchForUser(match.matchId, match.player1.userId);
                const matchData2 = await this.arenaDB.getMatchForUser(match.matchId, match.player2.userId);

                console.log('📤 [Arena] Sending match-found events...');
                player1Socket.emit('arena:match-found', matchData1);
                player2Socket.emit('arena:match-found', matchData2);

                // Store active match
                this.activeMatches.set(match.matchId, {
                    player1: match.player1.userId,
                    player2: match.player2.userId,
                    currentQuestionIndex: 0
                });

                console.log('🎮 [Arena] Match setup complete!');

                // Broadcast updated arena stats to all clients
                await this.broadcastArenaStats();
            } else {
                console.error('❌ [Arena] Could not find both player sockets!');
                console.log('🔍 [Arena] Available sockets:');
                for (const [socketId, socket] of this.io.sockets.sockets) {
                    console.log(`   - Socket ${socketId}: userId=${socket.userId}, username=${socket.username}`);
                }
            }
        } catch (error) {
            console.error('[Arena] Handle match created error:', error);
        }
    }

    // Start match for both players
    async startMatchForPlayers(match) {
        try {
            console.log('🚀 [Arena] Starting match for both players...');
            console.log('🔍 [Arena] Match object:', {
                matchId: match.matchId,
                player1: match.player1?.userId,
                player2: match.player2?.userId,
                questionsLength: match.questions?.length
            });
            
            // Initialize player progress tracking
            this.playerProgress.set(match.player1.userId, {
                matchId: match.matchId,
                currentQuestionIndex: 0,
                questionsCompleted: 0,
                score: 0
            });
            
            this.playerProgress.set(match.player2.userId, {
                matchId: match.matchId,
                currentQuestionIndex: 0,
                questionsCompleted: 0,
                score: 0
            });

            console.log(`📊 [Arena] Initialized progress for both players`);

            // Start first question for both players independently
            console.log(`📝 [Arena] Starting question 0 for player 1: ${match.player1.userId}`);
            await this.startQuestionForPlayer(match.matchId, match.player1.userId, 0);
            
            console.log(`📝 [Arena] Starting question 0 for player 2: ${match.player2.userId}`);
            await this.startQuestionForPlayer(match.matchId, match.player2.userId, 0);
            
            console.log('✅ [Arena] Match started with independent progression for both players');
        } catch (error) {
            console.error('[Arena] Start match error:', error);
        }
    }

    // Start question for individual player (independent progression)
    async startQuestionForPlayer(matchId, userId, questionIndex) {
        try {
            console.log(`📝 [Arena] Starting question ${questionIndex} for player ${userId}`);
            
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) {
                console.error(`❌ [Arena] Match ${matchId} not found`);
                return;
            }

            console.log(`🔍 [Arena] Found match with ${match.questions?.length || 0} questions`);

            const currentQuestion = match.questions[questionIndex];
            if (!currentQuestion) {
                console.log(`🏁 [Arena] No more questions for player ${userId}, match complete`);
                await this.handlePlayerMatchComplete(matchId, userId);
                return;
            }

            console.log(`📋 [Arena] Current question: ${currentQuestion.problemId} (${currentQuestion.difficulty})`);

            // Get problem details
            const problem = await this.problemDB.getProblemById(currentQuestion.problemId);
            if (!problem) {
                console.error(`❌ [Arena] Problem not found: ${currentQuestion.problemId}`);
                return;
            }

            console.log(`✅ [Arena] Found problem: ${problem.title} (ID: ${problem.problemId})`);
            console.log(`📝 [Arena] Problem difficulty: ${problem.difficulty}, category: ${problem.category}`);

            // Start independent timer for this player
            this.startPlayerTimer(matchId, userId, questionIndex, currentQuestion.timeLimit);

            // Send question to specific player
            const playerSocket = this.findSocketByUserId(userId);
            if (playerSocket) {
                console.log(`📡 [Arena] Sending question to player ${userId} via socket ${playerSocket.id}`);
                playerSocket.emit('arena:question-start', {
                    questionIndex,
                    problem: {
                        problemId: problem.problemId,
                        title: problem.title,
                        description: problem.description,
                        difficulty: problem.difficulty,
                        examples: problem.examples,
                        constraints: problem.constraints,
                        timeLimit: currentQuestion.timeLimit
                    },
                    timeRemaining: currentQuestion.timeLimit,
                    playerProgress: this.playerProgress.get(userId)
                });
                
                console.log(`✅ [Arena] Question ${questionIndex} sent to player ${userId}`);
            } else {
                console.error(`❌ [Arena] Socket not found for player ${userId}`);
            }
        } catch (error) {
            console.error('[Arena] Start question for player error:', error);
        }
    }

    // Start independent timer for each player
    startPlayerTimer(matchId, userId, questionIndex, timeLimit) {
        const timerId = `${matchId}:${userId}:${questionIndex}`;
        
        console.log(`⏰ [Arena] Starting ${timeLimit}s timer for player ${userId}, question ${questionIndex}`);
        
        // Clear existing timer if any
        if (this.playerTimers.has(timerId)) {
            clearInterval(this.playerTimers.get(timerId));
        }

        let timeRemaining = timeLimit;
        const timer = setInterval(async () => {
            timeRemaining--;
            
            // Send time update to specific player every 10 seconds or when < 10s left
            if (timeRemaining % 10 === 0 || timeRemaining <= 10) {
                const playerSocket = this.findSocketByUserId(userId);
                if (playerSocket) {
                    // Get current match and both players' progress for score updates
                    const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId }).catch(() => null);
                    let matchData = null;
                    
                    if (match) {
                        const player1Progress = this.playerProgress.get(match.player1.userId);
                        const player2Progress = this.playerProgress.get(match.player2.userId);
                        
                        matchData = {
                            player1: {
                                userId: match.player1.userId,
                                username: match.player1.username,
                                score: player1Progress?.score || 0
                            },
                            player2: {
                                userId: match.player2.userId,
                                username: match.player2.username,
                                score: player2Progress?.score || 0
                            }
                        };
                    }
                    
                    playerSocket.emit('arena:time-update', {
                        questionIndex,
                        timeRemaining,
                        playerProgress: this.playerProgress.get(userId),
                        matchData: matchData
                    });
                }
            }

            // Time's up for this player!
            if (timeRemaining <= 0) {
                clearInterval(timer);
                this.playerTimers.delete(timerId);
                
                console.log(`⏰ [Arena] Timer expired for player ${userId}, question ${questionIndex}`);
                await this.handlePlayerQuestionTimeout(matchId, userId, questionIndex);
            }
        }, 1000);

        this.playerTimers.set(timerId, timer);
    }

    // Handle when a player's question timer expires
    async handlePlayerQuestionTimeout(matchId, userId, questionIndex) {
        try {
            console.log(`🕐 [Arena] Question ${questionIndex} timed out for player ${userId}`);
            
            // Update player progress
            const progress = this.playerProgress.get(userId);
            if (progress) {
                progress.currentQuestionIndex++;
                
                // Notify player of timeout and auto-advance
                const playerSocket = this.findSocketByUserId(userId);
                if (playerSocket) {
                    playerSocket.emit('arena:question-timeout', {
                        questionIndex,
                        message: 'Time\'s up! Moving to next question...',
                        nextQuestionIndex: progress.currentQuestionIndex
                    });
                }
                
                // Start next question for this player
                setTimeout(() => {
                    this.startQuestionForPlayer(matchId, userId, progress.currentQuestionIndex);
                }, 2000); // 2 second delay before next question
            }
        } catch (error) {
            console.error('[Arena] Handle player question timeout error:', error);
        }
    }

    // Handle when a player completes all questions
    async handlePlayerMatchComplete(matchId, userId) {
        try {
            console.log(`🏁 [Arena] Player ${userId} completed all questions in match ${matchId}`);
            
            const playerSocket = this.findSocketByUserId(userId);
            if (playerSocket) {
                const progress = this.playerProgress.get(userId);
                playerSocket.emit('arena:player-complete', {
                    message: 'Congratulations! You\'ve completed all questions!',
                    finalScore: progress?.score || 0,
                    questionsCompleted: progress?.questionsCompleted || 0
                });
            }
            
            // Check if both players are done
            await this.checkMatchCompletion(matchId);
        } catch (error) {
            console.error('[Arena] Handle player match complete error:', error);
        }
    }

    // Check if the entire match should end
    async checkMatchCompletion(matchId) {
        try {
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) return;
            
            const player1Progress = this.playerProgress.get(match.player1.userId);
            const player2Progress = this.playerProgress.get(match.player2.userId);
            
            // Check if both players completed all questions
            const totalQuestions = match.questions.length;
            const player1Done = player1Progress?.currentQuestionIndex >= totalQuestions;
            const player2Done = player2Progress?.currentQuestionIndex >= totalQuestions;
            
            if (player1Done && player2Done) {
                console.log(`🏁 [Arena] Both players completed match ${matchId}`);
                
                // Calculate winner based on scores
                const player1Score = player1Progress?.score || 0;
                const player2Score = player2Progress?.score || 0;
                
                let winner = null;
                if (player1Score > player2Score) {
                    winner = match.player1.userId;
                    console.log(`🎉 [Arena] Player 1 (${match.player1.username}) wins with ${player1Score} vs ${player2Score}`);
                } else if (player2Score > player1Score) {
                    winner = match.player2.userId;
                    console.log(`🎉 [Arena] Player 2 (${match.player2.username}) wins with ${player2Score} vs ${player1Score}`);
                } else {
                    console.log(`🤝 [Arena] Match is a draw: ${player1Score} vs ${player2Score}`);
                }
                
                // Update match with final results
                match.status = 'completed';
                match.winner = winner;
                match.endedAt = new Date();
                match.totalDuration = Math.floor((match.endedAt - match.startedAt) / 1000);
                match.player1.finalScore = player1Score;
                match.player1.questionsCompleted = player1Progress?.questionsCompleted || 0;
                match.player2.finalScore = player2Score;
                match.player2.questionsCompleted = player2Progress?.questionsCompleted || 0;
                
                await match.save();
                
                await this.handleMatchEnd(matchId);
            }
        } catch (error) {
            console.error('[Arena] Check match completion error:', error);
        }
    }

    // Start question timer (legacy method, replaced by startPlayerTimer)
    startQuestionTimer(matchId, questionIndex, timeLimit) {
        const timerId = `${matchId}:${questionIndex}`;
        
        // Clear existing timer if any
        if (this.questionTimers.has(timerId)) {
            clearInterval(this.questionTimers.get(timerId));
        }

        let timeRemaining = timeLimit;
        const timer = setInterval(async () => {
            timeRemaining--;
            
            // Send time update every 10 seconds
            if (timeRemaining % 10 === 0 || timeRemaining <= 10) {
                // Get current match data
                const match = await this.arenaDB.getMatch(matchId);
                if (match) {
                    const player1Progress = this.playerProgress.get(match.player1.userId);
                    const player2Progress = this.playerProgress.get(match.player2.userId);
                    
                    this.io.to(`match:${matchId}`).emit('arena:time-update', {
                        questionIndex,
                        timeRemaining,
                        player1Progress,
                        player2Progress,
                        matchData: {
                            player1: { ...match.player1, score: player1Progress?.score || 0 },
                            player2: { ...match.player2, score: player2Progress?.score || 0 }
                        }
                    });
                }
            }

            // Time's up!
            if (timeRemaining <= 0) {
                clearInterval(timer);
                this.questionTimers.delete(timerId);
                
                await this.handleQuestionTimeout(matchId, questionIndex);
            }
        }, 1000);

        this.questionTimers.set(timerId, timer);
    }

    // Handle question timeout
    async handleQuestionTimeout(matchId, questionIndex) {
        try {
            // Move to next question or end match
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) return;

            const question = match.questions[questionIndex];
            question.completedAt = new Date();

            if (questionIndex < match.questions.length - 1) {
                // Move to next question
                match.currentQuestionIndex = questionIndex + 1;
                match.questions[questionIndex + 1].startedAt = new Date();
                await match.save();

                await this.startNextQuestion(matchId, questionIndex + 1);
            } else {
                // End match
                await this.arenaDB.endMatch(match);
                await this.handleMatchEnd(matchId);
            }
        } catch (error) {
            console.error('[Arena] Handle question timeout error:', error);
        }
    }

    // Start next question
    async startNextQuestion(matchId, questionIndex) {
        try {
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) return;

            const currentQuestion = match.questions[questionIndex];
            if (!currentQuestion) return;

            const problem = await this.problemDB.getProblemById(currentQuestion.problemId);
            if (!problem) return;

            // Start new timer
            this.startQuestionTimer(matchId, questionIndex, currentQuestion.timeLimit);

            // Notify players
            this.io.to(`match:${matchId}`).emit('arena:question-start', {
                questionIndex,
                problem: {
                    problemId: problem.problemId,
                    title: problem.title,
                    description: problem.description,
                    difficulty: problem.difficulty,
                    examples: problem.examples,
                    constraints: problem.constraints,
                    timeLimit: currentQuestion.timeLimit
                },
                timeRemaining: currentQuestion.timeLimit
            });
        } catch (error) {
            console.error('[Arena] Start next question error:', error);
        }
    }

    // Handle test run (Run & Test button)
    async handleTestRun(socket, matchId, code, language) {
        try {
            console.log(`🧪 [Arena] Handling test run from player ${socket.userId}`);
            
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) throw new Error('Match not found');

            const playerProgress = this.playerProgress.get(socket.userId);
            if (!playerProgress) throw new Error('Player progress not found');

            const currentQuestionIndex = playerProgress.currentQuestionIndex;
            const currentQuestion = match.questions[currentQuestionIndex];
            
            if (!currentQuestion) {
                socket.emit('arena:test-result', {
                    success: false,
                    error: 'No active question found'
                });
                return;
            }

            // Get problem with test cases
            const problem = await this.problemDB.getProblemWithTestCases(currentQuestion.problemId);
            if (!problem) throw new Error('Problem not found');

            console.log(`🔍 [Arena] Running test cases for problem ${currentQuestion.problemId} (${problem.title})`);
            console.log(`📋 [Arena] Problem has ${problem.testCases.length} total test cases`);

            // Run only sample/visible test cases (not hidden ones) for Run & Test
            const sampleTestCases = problem.testCases.filter(tc => !tc.isHidden).slice(0, 3); // Show up to 3 sample cases
            const results = [];

            console.log(`🧪 [Arena] Running ${sampleTestCases.length} sample test cases for ${currentQuestion.problemId}`);

            for (const testCase of sampleTestCases) {
                const result = await this.problemDB.runTestCase(code, language, testCase, problem.timeLimit);
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.actualOutput,
                    passed: result.passed,
                    errorMessage: result.errorMessage,
                    executionTime: result.executionTime
                });
            }

            const passedTests = results.filter(r => r.passed).length;
            const totalTests = results.length;

            console.log(`📊 [Arena] Test results: ${passedTests}/${totalTests} sample cases passed`);

            // Send test results to the specific player only
            socket.emit('arena:test-result', {
                success: true,
                results,
                totalTests: totalTests,
                passedTests: passedTests,
                feedback: totalTests > 0 
                    ? `${passedTests}/${totalTests} sample test cases passed`
                    : 'No sample test cases available',
                questionIndex: currentQuestionIndex,
                problemId: currentQuestion.problemId, // Add problemId for debugging
                problemTitle: problem.title // Add problem title for debugging
            });

        } catch (error) {
            console.error('[Arena] Test run error:', error);
            socket.emit('arena:test-result', {
                success: false,
                error: error.message,
                feedback: 'Test execution failed: ' + error.message
            });
        }
    }

    // Handle final submission (Submit button)
    async handleSubmission(socket, matchId, code, language) {
        try {
            console.log(`📝 [Arena] Handling submission from player ${socket.userId}`);
            
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) throw new Error('Match not found');

            const playerProgress = this.playerProgress.get(socket.userId);
            if (!playerProgress) throw new Error('Player progress not found');

            const currentQuestionIndex = playerProgress.currentQuestionIndex;
            const currentQuestion = match.questions[currentQuestionIndex];
            
            if (!currentQuestion) {
                socket.emit('arena:error', { message: 'No active question found' });
                return;
            }

            // Get problem details with test cases
            const problem = await this.problemDB.getProblemWithTestCases(currentQuestion.problemId);
            if (!problem) throw new Error('Problem not found');

            console.log(`🧪 [Arena] Validating solution for player ${socket.userId}, question ${currentQuestionIndex}`);

            // Validate solution against all test cases
            const validationResult = await this.problemDB.validateSolution(code, language, problem);
            
            console.log(`📊 [Arena] Validation result: ${validationResult.testCasesPassed}/${validationResult.totalTestCases} passed`);

            // Calculate points based on test cases passed
            const pointsPerCase = 10; // Base points per test case
            const basePoints = (validationResult.testCasesPassed / validationResult.totalTestCases) * pointsPerCase;
            let totalPoints = Math.round(basePoints);
            
            // Bonus points for full solution
            let isComplete = false;
            if (validationResult.testCasesPassed === validationResult.totalTestCases) {
                totalPoints += 5; // +5 bonus for correct solution
                isComplete = true;
                console.log(`🎉 [Arena] Player ${socket.userId} solved question ${currentQuestionIndex} completely! +5 bonus`);
            } else {
                console.log(`⚠️ [Arena] Player ${socket.userId} partial solution: ${validationResult.testCasesPassed}/${validationResult.totalTestCases} test cases passed`);
            }

            // Update player progress (even for wrong submissions)
            playerProgress.score += totalPoints;
            if (isComplete) {
                playerProgress.questionsCompleted++;
            }
            
            // Stop the current timer for this player
            const timerId = `${matchId}:${socket.userId}:${currentQuestionIndex}`;
            if (this.playerTimers.has(timerId)) {
                clearInterval(this.playerTimers.get(timerId));
                this.playerTimers.delete(timerId);
                console.log(`⏰ [Arena] Stopped timer for player ${socket.userId}`);
            }

            // Notify the player of their result
            socket.emit('arena:submission-result', {
                questionIndex: currentQuestionIndex,
                result: {
                    success: isComplete,
                    testCasesPassed: validationResult.testCasesPassed,
                    totalTestCases: validationResult.totalTestCases,
                    points: totalPoints,
                    executionTime: validationResult.executionTime,
                    feedback: isComplete 
                        ? 'Perfect! All test cases passed!' 
                        : totalPoints > 0
                        ? `Partial credit: ${validationResult.testCasesPassed}/${validationResult.totalTestCases} test cases passed`
                        : 'No test cases passed. Try again or move to next question.',
                    canRetry: !isComplete // Allow retry for incomplete solutions
                },
                playerProgress: playerProgress
            });

            // Always advance to next question after submission (wrong or right)
            playerProgress.currentQuestionIndex++;
            
            const advanceDelay = isComplete ? 3000 : 5000; // Longer delay for wrong submissions to review
            setTimeout(() => {
                this.startQuestionForPlayer(matchId, socket.userId, playerProgress.currentQuestionIndex);
            }, advanceDelay);

        } catch (error) {
            console.error('[Arena] Handle submission error:', error);
            socket.emit('arena:error', { message: 'Submission failed: ' + error.message });
        }
    }

    // Handle match end
    async handleMatchEnd(matchId) {
        try {
            // Clear any active player timers for this match
            const timersToDelete = [];
            for (const [timerId, timer] of this.playerTimers.entries()) {
                if (timerId.startsWith(matchId)) {
                    clearInterval(timer);
                    timersToDelete.push(timerId);
                }
            }
            timersToDelete.forEach(timerId => this.playerTimers.delete(timerId));

            // Clear legacy timers too
            for (const [timerId, timer] of this.questionTimers.entries()) {
                if (timerId.startsWith(matchId)) {
                    clearInterval(timer);
                    this.questionTimers.delete(timerId);
                }
            }

            // Get final match data with updated results
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) return;

            console.log(`📤 [Arena] Sending match end event for match ${matchId}:`, {
                winner: match.winner,
                player1Score: match.player1.finalScore,
                player2Score: match.player2.finalScore
            });

            // Notify both players with complete match results
            this.io.to(`match:${matchId}`).emit('arena:match-end', {
                winner: match.winner,
                isDraw: !match.winner,
                player1: {
                    userId: match.player1.userId,
                    username: match.player1.username,
                    score: match.player1.finalScore || 0,
                    questionsCompleted: match.player1.questionsCompleted || 0,
                    bonusPoints: 0 // Can be calculated if needed
                },
                player2: {
                    userId: match.player2.userId,
                    username: match.player2.username,
                    score: match.player2.finalScore || 0,
                    questionsCompleted: match.player2.questionsCompleted || 0,
                    bonusPoints: 0 // Can be calculated if needed
                },
                totalDuration: match.totalDuration || 0,
                matchId: matchId
            });

            // Clean up progress tracking
            this.playerProgress.delete(match.player1.userId);
            this.playerProgress.delete(match.player2.userId);

            // Remove from active matches
            this.activeMatches.delete(matchId);

            // Broadcast updated player stats to both players
            await this.broadcastPlayerStatsUpdate(match.player1.userId);
            await this.broadcastPlayerStatsUpdate(match.player2.userId);

            // Broadcast updated arena stats to all clients
            await this.broadcastArenaStats();
            
            console.log(`✅ [Arena] Match ${matchId} ended successfully`);
        } catch (error) {
            console.error('[Arena] Handle match end error:', error);
        }
    }

    // Find socket by user ID
    findSocketByUserId(userId) {
        for (const [socketId, socket] of this.io.sockets.sockets) {
            if (socket.userId === userId) {
                return socket;
            }
        }
        return null;
    }

    // Get arena statistics
    async getArenaStats() {
        try {
            const totalMatches = await ArenaDBHandler.ArenaMatch.countDocuments({ status: 'completed' });
            const activeMatches = await ArenaDBHandler.ArenaMatch.countDocuments({ status: 'in_progress' });
            const playersInQueue = await ArenaDBHandler.ArenaQueue.countDocuments({ status: 'waiting' });
            
            return {
                totalMatches,
                activeMatches,
                playersInQueue,
                onlineUsers: this.io.sockets.sockets.size
            };
        } catch (error) {
            console.error('[Arena] Get arena stats error:', error);
            return { totalMatches: 0, activeMatches: 0, playersInQueue: 0, onlineUsers: 0 };
        }
    }

    // Broadcast updated arena stats to all clients
    async broadcastArenaStats() {
        try {
            const stats = await this.getArenaStats();
            this.io.emit('arena:stats-update', { stats });
        } catch (error) {
            console.error('[Arena] Broadcast stats error:', error);
        }
    }

    // Broadcast updated player stats to a specific user
    async broadcastPlayerStatsUpdate(userId) {
        try {
            const stats = await this.arenaDB.getPlayerStats(userId);
            const socket = this.findSocketByUserId(userId);
            
            if (socket && stats) {
                socket.emit('arena:player-stats-update', { stats });
                console.log(`📊 [Arena] Broadcasted player stats update to user ${userId}`);
            }
        } catch (error) {
            console.error('[Arena] Broadcast player stats error:', error);
        }
    }
}

export { ArenaSocketHandler };
