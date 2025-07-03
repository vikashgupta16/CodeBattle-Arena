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
        
        // Store active matches and timers
        this.activeMatches = new Map();
        this.questionTimers = new Map();
        
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[Arena] User connected: ${socket.id}`);

            // Join arena queue
            socket.on('arena:join-queue', async (data) => {
                try {
                    const { userId, username, difficulty } = data;
                    
                    if (!userId || !username || !difficulty) {
                        socket.emit('arena:error', { message: 'Missing required data' });
                        return;
                    }

                    // Store user info in socket
                    socket.userId = userId;
                    socket.username = username;

                    const result = await this.arenaDB.joinQueue(userId, username, difficulty);
                    
                    if (result.matched) {
                        // Match found - notify both players
                        await this.handleMatchCreated(result.match);
                    } else {
                        // Added to queue
                        socket.join(`queue:${difficulty}`);
                        socket.emit('arena:queue-joined', {
                            position: result.queuePosition,
                            difficulty
                        });
                    }
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
                    }
                } catch (error) {
                    console.error('[Arena] Leave queue error:', error);
                }
            });

            // Ready to start match
            socket.on('arena:ready', async (data) => {
                try {
                    const { matchId } = data;
                    const match = await this.arenaDB.startMatch(matchId);
                    
                    // Join match room
                    socket.join(`match:${matchId}`);
                    
                    // Start the match for both players
                    await this.startMatchForPlayers(match);
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
            const player1Socket = this.findSocketByUserId(match.player1.userId);
            const player2Socket = this.findSocketByUserId(match.player2.userId);

            if (player1Socket && player2Socket) {
                // Remove from queue rooms
                player1Socket.leave(`queue:${match.player1.selectedDifficulty}`);
                player2Socket.leave(`queue:${match.player2.selectedDifficulty}`);

                // Join match room
                player1Socket.join(`match:${match.matchId}`);
                player2Socket.join(`match:${match.matchId}`);

                // Notify both players
                const matchData1 = await this.arenaDB.getMatchForUser(match.matchId, match.player1.userId);
                const matchData2 = await this.arenaDB.getMatchForUser(match.matchId, match.player2.userId);

                player1Socket.emit('arena:match-found', matchData1);
                player2Socket.emit('arena:match-found', matchData2);

                // Store active match
                this.activeMatches.set(match.matchId, {
                    player1: match.player1.userId,
                    player2: match.player2.userId,
                    currentQuestionIndex: 0
                });
            }
        } catch (error) {
            console.error('[Arena] Handle match created error:', error);
        }
    }

    // Start match for both players
    async startMatchForPlayers(match) {
        try {
            // Get the first question
            const currentQuestion = match.questions[0];
            if (!currentQuestion) return;

            // Get problem details
            const problem = await this.problemDB.getProblemById(currentQuestion.problemId);
            if (!problem) return;

            // Start question timer
            this.startQuestionTimer(match.matchId, 0, currentQuestion.timeLimit);

            // Send question to both players
            this.io.to(`match:${match.matchId}`).emit('arena:question-start', {
                questionIndex: 0,
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
            console.error('[Arena] Start match error:', error);
        }
    }

    // Start question timer
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
                this.io.to(`match:${matchId}`).emit('arena:time-update', {
                    questionIndex,
                    timeRemaining
                });
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
            const match = await this.arenaDB.ArenaMatch.findOne({ matchId });
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
            const match = await this.arenaDB.ArenaMatch.findOne({ matchId });
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
            const match = await this.arenaDB.ArenaMatch.findOne({ matchId });
            if (!match) throw new Error('Match not found');

            const currentQuestion = match.questions[match.currentQuestionIndex];
            const problem = await this.problemDB.getProblemWithTestCases(currentQuestion.problemId);

            // Run only sample test cases (not hidden ones)
            const sampleTestCases = problem.testCases.filter(tc => !tc.isHidden).slice(0, 2);
            const results = [];

            for (const testCase of sampleTestCases) {
                const result = await this.problemDB.runTestCase(code, language, testCase);
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: result.actualOutput,
                    passed: result.passed,
                    errorMessage: result.errorMessage
                });
            }

            socket.emit('arena:test-result', {
                success: true,
                results,
                totalTests: sampleTestCases.length,
                passedTests: results.filter(r => r.passed).length
            });
        } catch (error) {
            console.error('[Arena] Test run error:', error);
            socket.emit('arena:test-result', {
                success: false,
                error: error.message
            });
        }
    }

    // Handle final submission (Submit button)
    async handleSubmission(socket, matchId, code, language) {
        try {
            const match = await this.arenaDB.ArenaMatch.findOne({ matchId });
            if (!match) throw new Error('Match not found');

            const currentQuestion = match.questions[match.currentQuestionIndex];
            const problem = await this.problemDB.getProblemWithTestCases(currentQuestion.problemId);

            // Validate solution against all test cases
            const validationResult = await this.problemDB.validateSolution(code, language, problem);

            // Submit to match
            const result = await this.arenaDB.submitMatchSolution(
                matchId,
                socket.userId,
                match.currentQuestionIndex,
                {
                    code,
                    language,
                    testCasesPassed: validationResult.testCasesPassed,
                    totalTestCases: validationResult.totalTestCases,
                    executionTime: validationResult.executionTime
                }
            );

            // Notify both players
            this.io.to(`match:${matchId}`).emit('arena:submission-result', {
                userId: socket.userId,
                questionIndex: match.currentQuestionIndex,
                result: validationResult,
                bonusAwarded: result.bonusAwarded,
                points: result.submission.points
            });

            // Update match data for both players
            const player1Match = await this.arenaDB.getMatchForUser(matchId, match.player1.userId);
            const player2Match = await this.arenaDB.getMatchForUser(matchId, match.player2.userId);

            const player1Socket = this.findSocketByUserId(match.player1.userId);
            const player2Socket = this.findSocketByUserId(match.player2.userId);

            if (player1Socket) player1Socket.emit('arena:match-update', player1Match);
            if (player2Socket) player2Socket.emit('arena:match-update', player2Match);

            // Check if question is completed or match ended
            if (result.match.status === 'completed') {
                await this.handleMatchEnd(matchId);
            } else if (result.match.currentQuestionIndex > match.currentQuestionIndex) {
                // Move to next question
                await this.startNextQuestion(matchId, result.match.currentQuestionIndex);
            }

        } catch (error) {
            console.error('[Arena] Submission error:', error);
            socket.emit('arena:submission-result', {
                success: false,
                error: error.message
            });
        }
    }

    // Handle match end
    async handleMatchEnd(matchId) {
        try {
            // Clear any active timers
            for (const [timerId, timer] of this.questionTimers.entries()) {
                if (timerId.startsWith(matchId)) {
                    clearInterval(timer);
                    this.questionTimers.delete(timerId);
                }
            }

            // Get final match data
            const match = await this.arenaDB.ArenaMatch.findOne({ matchId });
            if (!match) return;

            // Notify both players
            this.io.to(`match:${matchId}`).emit('arena:match-end', {
                winner: match.winner,
                player1: match.player1,
                player2: match.player2,
                totalDuration: match.totalDuration
            });

            // Remove from active matches
            this.activeMatches.delete(matchId);
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
            const totalMatches = await this.arenaDB.ArenaMatch.countDocuments({ status: 'completed' });
            const activeMatches = await this.arenaDB.ArenaMatch.countDocuments({ status: 'in_progress' });
            const playersInQueue = await this.arenaDB.ArenaQueue.countDocuments({ status: 'waiting' });
            
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
}

export { ArenaSocketHandler };
