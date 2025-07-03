import mongoose from "mongoose";

// Arena Match Schema
const arenaMatchSchema = new mongoose.Schema({
    matchId: { type: String, unique: true, required: true },
    player1: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        selectedDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
        score: { type: Number, default: 0 },
        questionsCompleted: { type: Number, default: 0 },
        bonusPoints: { type: Number, default: 0 }
    },
    player2: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        selectedDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
        score: { type: Number, default: 0 },
        questionsCompleted: { type: Number, default: 0 },
        bonusPoints: { type: Number, default: 0 }
    },
    status: { 
        type: String, 
        enum: ['waiting', 'in_progress', 'completed', 'abandoned'], 
        default: 'waiting' 
    },
    currentQuestionIndex: { type: Number, default: 0 },
    questions: [{
        problemId: { type: String, required: true },
        difficulty: { type: String, required: true },
        timeLimit: { type: Number, required: true }, // in seconds
        startedAt: { type: Date },
        completedAt: { type: Date },
        winner: { type: String }, // userId of the player who solved first
        player1Submission: {
            code: String,
            language: String,
            submittedAt: Date,
            testCasesPassed: Number,
            totalTestCases: Number,
            executionTime: Number,
            points: Number
        },
        player2Submission: {
            code: String,
            language: String,
            submittedAt: Date,
            testCasesPassed: Number,
            totalTestCases: Number,
            executionTime: Number,
            points: Number
        }
    }],
    winner: { type: String }, // userId of the match winner
    startedAt: { type: Date },
    endedAt: { type: Date },
    totalDuration: { type: Number }, // in seconds
    createdAt: { type: Date, default: Date.now }
});

// Arena Queue Schema - for matchmaking
const arenaQueueSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    selectedDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['waiting', 'matched'], default: 'waiting' }
});

// Arena Player Stats Schema
const arenaPlayerStatsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    totalMatches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    totalBonusPoints: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    questionsCompleted: { type: Number, default: 0 },
    fastestSolve: { type: Number }, // in seconds
    easyWins: { type: Number, default: 0 },
    mediumWins: { type: Number, default: 0 },
    hardWins: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastMatchAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

class ArenaDBHandler {
    static ArenaMatch = mongoose.model("ArenaMatch", arenaMatchSchema);
    static ArenaQueue = mongoose.model("ArenaQueue", arenaQueueSchema);
    static ArenaPlayerStats = mongoose.model("ArenaPlayerStats", arenaPlayerStatsSchema);

    // Matchmaking: Join queue
    async joinQueue(userId, username, difficulty) {
        try {
            // Remove any existing queue entry for this user
            await ArenaDBHandler.ArenaQueue.deleteOne({ userId });

            // Add to queue
            const queueEntry = new ArenaDBHandler.ArenaQueue({
                userId,
                username,
                selectedDifficulty: difficulty
            });

            await queueEntry.save();

            // Try to find a match
            const opponent = await ArenaDBHandler.ArenaQueue.findOne({
                userId: { $ne: userId },
                selectedDifficulty: difficulty,
                status: 'waiting'
            }).sort({ joinedAt: 1 }); // Oldest first

            if (opponent) {
                // Create match
                const match = await this.createMatch(
                    { userId, username, difficulty },
                    { userId: opponent.userId, username: opponent.username, difficulty: opponent.selectedDifficulty }
                );

                // Remove both players from queue
                await ArenaDBHandler.ArenaQueue.deleteMany({
                    userId: { $in: [userId, opponent.userId] }
                });

                return { matched: true, match };
            }

            return { matched: false, queuePosition: await this.getQueuePosition(userId, difficulty) };
        } catch (error) {
            console.error('[ArenaDBHandler] joinQueue error:', error);
            throw error;
        }
    }

    // Leave queue
    async leaveQueue(userId) {
        try {
            await ArenaDBHandler.ArenaQueue.deleteOne({ userId });
            return true;
        } catch (error) {
            console.error('[ArenaDBHandler] leaveQueue error:', error);
            throw error;
        }
    }

    // Get queue position
    async getQueuePosition(userId, difficulty) {
        try {
            const position = await ArenaDBHandler.ArenaQueue.countDocuments({
                selectedDifficulty: difficulty,
                joinedAt: { $lt: new Date() },
                userId: { $ne: userId }
            });
            return position + 1;
        } catch (error) {
            console.error('[ArenaDBHandler] getQueuePosition error:', error);
            return 0;
        }
    }

    // Create a new match
    async createMatch(player1, player2) {
        try {
            const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Generate questions for the match
            const questions = await this.generateMatchQuestions(player1.difficulty, player2.difficulty);

            const match = new ArenaDBHandler.ArenaMatch({
                matchId,
                player1: {
                    userId: player1.userId,
                    username: player1.username,
                    selectedDifficulty: player1.difficulty
                },
                player2: {
                    userId: player2.userId,
                    username: player2.username,
                    selectedDifficulty: player2.difficulty
                },
                questions,
                status: 'waiting'
            });

            await match.save();
            return match;
        } catch (error) {
            console.error('[ArenaDBHandler] createMatch error:', error);
            throw error;
        }
    }

    // Generate questions for a match
    async generateMatchQuestions(player1Difficulty, player2Difficulty) {
        try {
            const { ProblemDBHandler } = await import('./problemDatabase.js');
            const problemHandler = new ProblemDBHandler();
            
            const questions = [];
            const questionsPerMatch = 5; // Configurable
            
            // Mix of difficulties based on players' preferences
            const difficulties = this.getDifficultyMix(player1Difficulty, player2Difficulty);
            
            for (let i = 0; i < questionsPerMatch; i++) {
                const difficulty = difficulties[i % difficulties.length];
                
                // Get random problem of this difficulty
                const problems = await problemHandler.getProblems({ difficulty });
                if (problems.length > 0) {
                    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
                    
                    questions.push({
                        problemId: randomProblem.problemId,
                        difficulty: randomProblem.difficulty,
                        timeLimit: this.getTimeLimit(randomProblem.difficulty)
                    });
                }
            }
            
            return questions;
        } catch (error) {
            console.error('[ArenaDBHandler] generateMatchQuestions error:', error);
            return [];
        }
    }

    // Get difficulty mix for the match
    getDifficultyMix(player1Difficulty, player2Difficulty) {
        // Create a fair mix based on both players' preferences
        const difficulties = [];
        
        if (player1Difficulty === player2Difficulty) {
            // Same difficulty - all questions of that difficulty
            for (let i = 0; i < 5; i++) {
                difficulties.push(player1Difficulty);
            }
        } else {
            // Different difficulties - mix them
            difficulties.push(player1Difficulty, player2Difficulty);
            difficulties.push(player1Difficulty, player2Difficulty);
            difficulties.push('medium'); // Neutral middle ground
        }
        
        return difficulties;
    }

    // Get time limit based on difficulty
    getTimeLimit(difficulty) {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 300; // 5 minutes
            case 'medium': return 480; // 8 minutes
            case 'hard': return 900; // 15 minutes
            default: return 300;
        }
    }

    // Start a match
    async startMatch(matchId) {
        try {
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) throw new Error('Match not found');

            match.status = 'in_progress';
            match.startedAt = new Date();
            
            // Start first question
            if (match.questions.length > 0) {
                match.questions[0].startedAt = new Date();
            }

            await match.save();
            return match;
        } catch (error) {
            console.error('[ArenaDBHandler] startMatch error:', error);
            throw error;
        }
    }

    // Submit solution in a match
    async submitMatchSolution(matchId, userId, questionIndex, submissionData) {
        try {
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) throw new Error('Match not found');

            const question = match.questions[questionIndex];
            if (!question) throw new Error('Question not found');

            const isPlayer1 = match.player1.userId === userId;
            const isPlayer2 = match.player2.userId === userId;

            if (!isPlayer1 && !isPlayer2) {
                throw new Error('User not in this match');
            }

            // Calculate points based on test cases passed
            const points = Math.round((submissionData.testCasesPassed / submissionData.totalTestCases) * 100);
            
            const submission = {
                code: submissionData.code,
                language: submissionData.language,
                submittedAt: new Date(),
                testCasesPassed: submissionData.testCasesPassed,
                totalTestCases: submissionData.totalTestCases,
                executionTime: submissionData.executionTime,
                points
            };

            // Check if this is the first correct solution
            let bonusAwarded = false;
            if (submissionData.testCasesPassed === submissionData.totalTestCases) {
                // Check if opponent hasn't solved it yet
                const opponentSubmission = isPlayer1 ? question.player2Submission : question.player1Submission;
                const opponentSolved = opponentSubmission && opponentSubmission.testCasesPassed === opponentSubmission.totalTestCases;
                
                if (!opponentSolved) {
                    // First to solve - award bonus
                    submission.points += 5; // Bonus points
                    question.winner = userId;
                    bonusAwarded = true;
                    
                    // Update player bonus points
                    if (isPlayer1) {
                        match.player1.bonusPoints += 5;
                    } else {
                        match.player2.bonusPoints += 5;
                    }
                }
            }

            // Save submission
            if (isPlayer1) {
                question.player1Submission = submission;
                match.player1.score += points;
                if (submissionData.testCasesPassed === submissionData.totalTestCases) {
                    match.player1.questionsCompleted += 1;
                }
            } else {
                question.player2Submission = submission;
                match.player2.score += points;
                if (submissionData.testCasesPassed === submissionData.totalTestCases) {
                    match.player2.questionsCompleted += 1;
                }
            }

            // Check if both players have submitted or time is up
            const bothSubmitted = question.player1Submission && question.player2Submission;
            const timeUp = this.isQuestionTimeUp(question);

            if (bothSubmitted || timeUp) {
                question.completedAt = new Date();
                
                // Move to next question or end match
                if (questionIndex < match.questions.length - 1) {
                    match.currentQuestionIndex = questionIndex + 1;
                    match.questions[questionIndex + 1].startedAt = new Date();
                } else {
                    // Match completed
                    await this.endMatch(match);
                }
            }

            await match.save();
            
            return {
                success: true,
                submission,
                bonusAwarded,
                match: await this.getMatchForUser(matchId, userId)
            };
        } catch (error) {
            console.error('[ArenaDBHandler] submitMatchSolution error:', error);
            throw error;
        }
    }

    // Check if question time is up
    isQuestionTimeUp(question) {
        if (!question.startedAt) return false;
        const elapsed = (new Date() - question.startedAt) / 1000;
        return elapsed >= question.timeLimit;
    }

    // End a match
    async endMatch(match) {
        try {
            match.status = 'completed';
            match.endedAt = new Date();
            match.totalDuration = (match.endedAt - match.startedAt) / 1000;

            // Determine winner
            if (match.player1.score > match.player2.score) {
                match.winner = match.player1.userId;
            } else if (match.player2.score > match.player1.score) {
                match.winner = match.player2.userId;
            }
            // If scores are equal, it's a draw (no winner)

            await match.save();

            // Update player stats
            await this.updatePlayerStats(match);

            return match;
        } catch (error) {
            console.error('[ArenaDBHandler] endMatch error:', error);
            throw error;
        }
    }

    // Update player statistics
    async updatePlayerStats(match) {
        try {
            const player1Stats = await this.getOrCreatePlayerStats(match.player1.userId, match.player1.username);
            const player2Stats = await this.getOrCreatePlayerStats(match.player2.userId, match.player2.username);

            // Update both players' stats
            for (const [player, stats] of [[match.player1, player1Stats], [match.player2, player2Stats]]) {
                stats.totalMatches += 1;
                stats.totalScore += player.score;
                stats.totalBonusPoints += player.bonusPoints;
                stats.questionsCompleted += player.questionsCompleted;
                stats.lastMatchAt = match.endedAt;

                if (match.winner === player.userId) {
                    stats.wins += 1;
                    stats.currentStreak += 1;
                    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
                    
                    // Increment difficulty-specific wins
                    switch (player.selectedDifficulty) {
                        case 'easy': stats.easyWins += 1; break;
                        case 'medium': stats.mediumWins += 1; break;
                        case 'hard': stats.hardWins += 1; break;
                    }
                } else if (match.winner) {
                    stats.losses += 1;
                    stats.currentStreak = 0;
                } else {
                    stats.draws += 1;
                }

                // Calculate averages
                stats.averageScore = stats.totalScore / stats.totalMatches;
                stats.winRate = (stats.wins / stats.totalMatches) * 100;
                stats.updatedAt = new Date();

                await stats.save();
            }
        } catch (error) {
            console.error('[ArenaDBHandler] updatePlayerStats error:', error);
        }
    }

    // Get or create player stats
    async getOrCreatePlayerStats(userId, username) {
        try {
            let stats = await ArenaDBHandler.ArenaPlayerStats.findOne({ userId });
            if (!stats) {
                stats = new ArenaDBHandler.ArenaPlayerStats({ userId, username });
                await stats.save();
            }
            return stats;
        } catch (error) {
            console.error('[ArenaDBHandler] getOrCreatePlayerStats error:', error);
            throw error;
        }
    }

    // Get match data for a specific user (filtered view)
    async getMatchForUser(matchId, userId) {
        try {
            const match = await ArenaDBHandler.ArenaMatch.findOne({ matchId });
            if (!match) return null;

            const isPlayer1 = match.player1.userId === userId;
            const currentQuestion = match.questions[match.currentQuestionIndex];

            return {
                matchId: match.matchId,
                status: match.status,
                currentQuestionIndex: match.currentQuestionIndex,
                currentQuestion: currentQuestion ? {
                    problemId: currentQuestion.problemId,
                    difficulty: currentQuestion.difficulty,
                    timeLimit: currentQuestion.timeLimit,
                    startedAt: currentQuestion.startedAt,
                    timeRemaining: this.getTimeRemaining(currentQuestion)
                } : null,
                player: isPlayer1 ? match.player1 : match.player2,
                opponent: isPlayer1 ? match.player2 : match.player1,
                startedAt: match.startedAt,
                endedAt: match.endedAt,
                winner: match.winner
            };
        } catch (error) {
            console.error('[ArenaDBHandler] getMatchForUser error:', error);
            throw error;
        }
    }

    // Get time remaining for current question
    getTimeRemaining(question) {
        if (!question.startedAt) return question.timeLimit;
        const elapsed = (new Date() - question.startedAt) / 1000;
        return Math.max(0, question.timeLimit - elapsed);
    }

    // Get player stats
    async getPlayerStats(userId) {
        try {
            const stats = await ArenaDBHandler.ArenaPlayerStats.findOne({ userId });
            return stats || {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                winRate: 0,
                averageScore: 0,
                currentStreak: 0,
                bestStreak: 0
            };
        } catch (error) {
            console.error('[ArenaDBHandler] getPlayerStats error:', error);
            throw error;
        }
    }

    // Get leaderboard
    async getArenaLeaderboard(limit = 20) {
        try {
            const leaderboard = await ArenaDBHandler.ArenaPlayerStats
                .find({ totalMatches: { $gt: 0 } })
                .sort({ winRate: -1, totalScore: -1 })
                .limit(limit);

            return leaderboard.map((player, index) => ({
                rank: index + 1,
                username: player.username,
                totalMatches: player.totalMatches,
                wins: player.wins,
                losses: player.losses,
                draws: player.draws,
                winRate: Math.round(player.winRate * 100) / 100,
                averageScore: Math.round(player.averageScore * 100) / 100,
                currentStreak: player.currentStreak,
                bestStreak: player.bestStreak
            }));
        } catch (error) {
            console.error('[ArenaDBHandler] getArenaLeaderboard error:', error);
            return [];
        }
    }
}

export { ArenaDBHandler };
