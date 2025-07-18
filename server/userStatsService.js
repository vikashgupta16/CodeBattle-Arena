import { UserDBHandler } from './database.js';
import mongoose from 'mongoose';

// Arena Player Stats Schema - Import the schema here for consistency
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

/**
 * Common User Statistics Service
 * Handles user stats logic for both homepage and leaderboard
 */
class UserStatsService {
    
    constructor(arenaSocketHandler = null) {
        // Initialize ArenaPlayerStats model (check if already exists to avoid conflicts)
        try {
            this.ArenaPlayerStats = mongoose.model("ArenaPlayerStats");
        } catch (error) {
            // Model doesn't exist, create it
            this.ArenaPlayerStats = mongoose.model("ArenaPlayerStats", arenaPlayerStatsSchema);
        }
        
        // Store reference to arena socket handler for system stats
        this.arenaSocketHandler = arenaSocketHandler;
    }

    /**
     * Get comprehensive user statistics
     * @param {string} userId - User ID
     * @returns {Object} User stats object
     */
    async getUserStats(userId) {
        try {
            const user = await UserDBHandler.Users.findOne({ userID: userId });
            
            if (!user) {
                return {
                    problemsSolved: 0,
                    easyCount: 0,
                    mediumCount: 0,
                    hardCount: 0,
                    realWorldCount: 0,
                    rank: 0,
                    streak_count: 0
                };
            }

            return {
                problemsSolved: user.problemsSolved || 0,
                easyCount: user.easyCount || 0,
                mediumCount: user.mediumCount || 0,
                hardCount: user.hardCount || 0,
                realWorldCount: user.realWorldCount || 0,
                rank: user.rank || 0,
                streak_count: user.streak_count || 0,
                lastSolvedDate: user.lastSolvedDate
            };
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get user stats:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard with user statistics and correct ranking positions
     * @param {number} limit - Number of users to return
     * @returns {Array} Array of user objects with stats and rank positions
     */
    async getLeaderboard(limit = 50) {
        try {
            const users = await UserDBHandler.Users.find({})
                .select('userID name problemsSolved easyCount mediumCount hardCount realWorldCount streak_count lastSolvedDate');

            // Calculate total points for each user

            const now = new Date();
            const userStats = users.map(user => {
                const easy = user.easyCount || 0;
                const medium = user.mediumCount || 0;
                const hard = user.hardCount || 0;
                const realWorld = user.realWorldCount || 0;
                // realWorld and hard both give 20 points each
                const totalPoints = (hard * 20) + (realWorld * 20) + (medium * 10) + (easy * 5);
                let streakDays = 0;
                if (user.lastSolvedDate && user.streak_count > 0) {
                    const last = new Date(user.lastSolvedDate);
                    streakDays = Math.floor((now - last) / (1000 * 60 * 60 * 24)) + 1;
                }
                return {
                    userID: user.userID,
                    name: user.name,
                    problemsSolved: user.problemsSolved || 0,
                    easyCount: easy,
                    mediumCount: medium,
                    hardCount: hard,
                    realWorldCount: realWorld,
                    streak_count: user.streak_count || 0,
                    lastSolvedDate: user.lastSolvedDate,
                    totalPoints,
                    streakDays
                };
            });

            // Sort by totalPoints DESC, then hardCount DESC, then realWorldCount DESC, then mediumCount DESC, then easyCount DESC, then userID ASC
            userStats.sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                if (b.hardCount !== a.hardCount) return b.hardCount - a.hardCount;
                if (b.realWorldCount !== a.realWorldCount) return b.realWorldCount - a.realWorldCount;
                if (b.mediumCount !== a.mediumCount) return b.mediumCount - a.mediumCount;
                if (b.easyCount !== a.easyCount) return b.easyCount - a.easyCount;
                return a.userID.localeCompare(b.userID);
            });

            // Assign rank positions with tie handling
            const leaderboardWithRanks = [];
            let currentRank = 1;
            for (let i = 0; i < userStats.length; i++) {
                const user = userStats[i];
                if (i > 0) {
                    const prev = userStats[i - 1];
                    if (
                        user.totalPoints !== prev.totalPoints ||
                        user.hardCount !== prev.hardCount ||
                        user.mediumCount !== prev.mediumCount ||
                        user.easyCount !== prev.easyCount
                    ) {
                        currentRank = i + 1;
                    }
                }
                leaderboardWithRanks.push({
                    userID: user.userID,
                    name: user.name,
                    problemsSolved: user.problemsSolved,
                    easyCount: user.easyCount,
                    mediumCount: user.mediumCount,
                    hardCount: user.hardCount,
                    realWorldCount: user.realWorldCount,
                    rankPosition: currentRank,
                    streak_count: user.streak_count,
                    lastSolvedDate: user.lastSolvedDate
                });
            }
            return leaderboardWithRanks.slice(0, limit);
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get leaderboard:', error);
            throw error;
        }
    }

    /**
     * Update user stats when a problem is solved
     * @param {string} userId - User ID
     * @param {string} difficulty - Problem difficulty
     * @param {string} category - Problem category
     * @returns {Object} Updated user stats
     */
    async updateUserOnProblemSolved(userId, difficulty, category) {
        try {
            const rankPoints = {
                'easy': 10,
                'medium': 25,
                'hard': 50,
                'real-world': 30  // Real-world projects get medium-high points
            };

            const points = rankPoints[difficulty] || 10;

            // Prepare update object
            const updateObj = {
                $inc: { 
                    rank: points,
                    problemsSolved: 1
                },
                $set: {
                    lastSolvedDate: new Date()
                }
            };

            // Increment difficulty-specific counter
            if (difficulty === 'easy') {
                updateObj.$inc.easyCount = 1;
            } else if (difficulty === 'medium') {
                updateObj.$inc.mediumCount = 1;
            } else if (difficulty === 'hard') {
                updateObj.$inc.hardCount = 1;
            } else if (difficulty === 'real-world') {
                updateObj.$inc.realWorldCount = 1;
            }

            // Update user data
            await UserDBHandler.Users.updateOne(
                { userID: userId },
                updateObj,
                { upsert: true }
            );

            // Handle streak separately
            await this.checkAndUpdateStreak(userId);

            // Return updated user stats
            return await this.getUserStats(userId);
        } catch (error) {
            console.error('[UserStatsService Error] updateUserOnProblemSolved failed:', error);
            throw error;
        }
    }

    /**
     * Check and update daily streak
     * @param {string} userId User ID
     */
    async checkAndUpdateStreak(userId) {
        try {
            const user = await UserDBHandler.Users.findOne({ userID: userId });
            if (!user) return;

            const today = new Date();
            const lastSolved = user.lastSolvedDate ? new Date(user.lastSolvedDate) : null;
            
            if (lastSolved) {
                const daysDiff = Math.floor((today - lastSolved) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === 1) {
                    // Continue streak
                    await UserDBHandler.Users.updateOne(
                        { userID: userId },
                        { 
                            $inc: { streak_count: 1 },
                            $set: { lastSolvedDate: today }
                        }
                    );
                } else if (daysDiff > 1) {
                    // Reset streak
                    await UserDBHandler.Users.updateOne(
                        { userID: userId },
                        { 
                            $set: { 
                                streak_count: 1,
                                lastSolvedDate: today 
                            }
                        }
                    );
                }
                // If daysDiff === 0, user already solved today, don't update streak
            } else {
                // First time solving
                await UserDBHandler.Users.updateOne(
                    { userID: userId },
                    { 
                        $set: { 
                            streak_count: 1,
                            lastSolvedDate: today 
                        }
                    }
                );
            }
        } catch (error) {
            console.error('[UserStatsService Error] checkAndUpdateStreak failed:', error);
        }
    }

    /**
     * Increment or set streak count (for compatibility with existing endpoint)
     * @param {string} userId User ID
     * @param {number} value Value to increment or set
     * @param {boolean} set Whether to set (true) or increment (false)
     */
    async incrementStreakCount(userId, value, set = false) {
        try {
            if (set) {
                await UserDBHandler.Users.updateOne({ userID: userId }, { $set: { streak_count: value } });
            } else {
                await UserDBHandler.Users.updateOne({ userID: userId }, { $inc: { streak_count: value } });
            }
        } catch (error) {
            console.error('[UserStatsService Error] incrementStreakCount failed:', error);
            throw error;
        }
    }

    /**
     * API endpoint to get user stats
     */
    async endpoint_getUserStats(req, res) {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const stats = await this.getCombinedUserStats(userId);
            res.json({ success: true, stats });
        } catch (error) {
            console.error('[UserStatsService] endpoint_getUserStats error:', error);
            res.status(500).json({ success: false, error: 'Failed to get user stats' });
        }
    }

    /**
     * API endpoint to get arena stats only
     */
    async endpoint_getArenaStats(req, res) {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const arenaStats = await this.getArenaStats(userId);
            res.json({ success: true, stats: arenaStats });
        } catch (error) {
            console.error('[UserStatsService] endpoint_getArenaStats error:', error);
            res.status(500).json({ success: false, error: 'Failed to get arena stats' });
        }
    }

    /**
     * API endpoint to get leaderboard
     */
    async endpoint_getLeaderboard(req, res) {
        try {
            const leaderboard = await this.getLeaderboard();
            res.json({ success: true, leaderboard });
        } catch (error) {
            console.error('[UserStatsService] endpoint_getLeaderboard error:', error);
            res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
        }
    }

    /**
     * API endpoint to get arena leaderboard
     */
    async endpoint_getArenaLeaderboard(req, res) {
        try {
            const arenaLeaderboard = await this.getArenaLeaderboard();
            res.json({ success: true, leaderboard: arenaLeaderboard });
        } catch (error) {
            console.error('[UserStatsService] endpoint_getArenaLeaderboard error:', error);
            res.status(500).json({ success: false, error: 'Failed to get arena leaderboard' });
        }
    }

    /**
     * API endpoint to update problem solved stats
     */
    async endpoint_updateOnProblemSolved(req, res) {
        try {
            const { difficulty, category } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            if (!difficulty || !category) {
                return res.status(400).json({ success: false, error: 'Difficulty and category are required' });
            }

            const updatedStats = await this.updateUserOnProblemSolved(userId, difficulty, category);
            res.json({ success: true, stats: updatedStats });
        } catch (error) {
            console.error('[UserStatsService] endpoint_updateOnProblemSolved error:', error);
            res.status(500).json({ success: false, error: 'Failed to update user stats' });
        }
    }

    /**
     * API endpoint to increment streak count
     */
    async endpoint_incrementStreakCount(req, res) {
        try {
            const { value, set } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const updateValue = parseInt(value) || 0;
            const updateObj = set === '1' ? 
                { $set: { streak_count: updateValue } } : 
                { $inc: { streak_count: updateValue } };

            await UserDBHandler.Users.updateOne(
                { userID: userId },
                updateObj
            );

            const updatedStats = await this.getUserStats(userId);
            res.json({ success: true, stats: updatedStats });
        } catch (error) {
            console.error('[UserStatsService] endpoint_incrementStreakCount error:', error);
            res.status(500).json({ success: false, error: 'Failed to update streak count' });
        }
    }

    /**
     * Migrate existing users to include realWorldCount field
     */
    async migrateUsersForRealWorld() {
        try {
            const result = await UserDBHandler.Users.updateMany(
                { realWorldCount: { $exists: false } },
                { $set: { realWorldCount: 0 } }
            );
            
            console.log(`[UserStatsService] Migrated ${result.modifiedCount} users with realWorldCount field`);
            return result.modifiedCount;
        } catch (error) {
            console.error('[UserStatsService Error] Migration failed:', error);
            throw error;
        }
    }

    /**
     * Get arena statistics for a user
     * @param {string} userId - User ID
     * @returns {Object} Arena stats object
     */
    async getArenaStats(userId) {
        try {
            const arenaStats = await this.ArenaPlayerStats.findOne({ userId });
            
            if (!arenaStats) {
                return {
                    totalMatches: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    winRate: 0,
                    averageScore: 0,
                    totalScore: 0,
                    questionsCompleted: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    easyWins: 0,
                    mediumWins: 0,
                    hardWins: 0,
                    lastMatchAt: null
                };
            }

            return {
                totalMatches: arenaStats.totalMatches || 0,
                wins: arenaStats.wins || 0,
                losses: arenaStats.losses || 0,
                draws: arenaStats.draws || 0,
                winRate: arenaStats.winRate || 0,
                averageScore: arenaStats.averageScore || 0,
                totalScore: arenaStats.totalScore || 0,
                questionsCompleted: arenaStats.questionsCompleted || 0,
                currentStreak: arenaStats.currentStreak || 0,
                bestStreak: arenaStats.bestStreak || 0,
                easyWins: arenaStats.easyWins || 0,
                mediumWins: arenaStats.mediumWins || 0,
                hardWins: arenaStats.hardWins || 0,
                lastMatchAt: arenaStats.lastMatchAt
            };
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get arena stats:', error);
            throw error;
        }
    }

    /**
     * Get combined user stats (problems + arena) including rank position
     * @param {string} userId - User ID
     * @returns {Object} Combined stats object with rank position
     */
    async getCombinedUserStats(userId) {
        try {
            const [problemStatsWithRank, arenaStats] = await Promise.all([
                this.getUserStatsWithRankPosition(userId),
                this.getArenaStats(userId)
            ]);

            return {
                // Problem solving stats
                problemsSolved: problemStatsWithRank.problemsSolved,
                easyCount: problemStatsWithRank.easyCount,
                mediumCount: problemStatsWithRank.mediumCount,
                hardCount: problemStatsWithRank.hardCount,
                realWorldCount: problemStatsWithRank.realWorldCount,
                rank: problemStatsWithRank.rank, // Accumulated rank points
                rankPosition: problemStatsWithRank.rankPosition, // Actual leaderboard position
                streak_count: problemStatsWithRank.streak_count,
                lastSolvedDate: problemStatsWithRank.lastSolvedDate,
                
                // Arena stats
                arena: arenaStats
            };
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get combined stats:', error);
            throw error;
        }
    }

    /**
     * Update arena stats when a match is completed
     * @param {Object} matchData - Match data with player results
     * @returns {Object} Updated arena stats for both players
     */
    async updateArenaStats(matchData) {
        try {
            const { player1, player2, winner, endedAt } = matchData;
            const updates = [];
            console.log('[ArenaStats DEBUG] updateArenaStats called with matchData:', JSON.stringify(matchData, null, 2));

            // Update both players
            for (const player of [player1, player2]) {
                const isWinner = winner === player.userId;
                const isLoser = winner && winner !== player.userId;
                const isDraw = !winner;

                // Ensure player has username - get from Users collection if needed
                let username = player.username;
                if (!username) {
                    const user = await UserDBHandler.Users.findOne({ userID: player.userId });
                    username = user?.name || `User_${player.userId.slice(-8)}`;
                }

                // Always coerce to numbers to avoid undefined/NaN
                const score = Number(player.score) || 0;
                const bonusPoints = Number(player.bonusPoints) || 0;
                const questionsCompleted = Number(player.questionsCompleted) || 0;

                const updateObj = {
                    $inc: {
                        totalMatches: 1,
                        totalScore: score,
                        totalBonusPoints: bonusPoints,
                        questionsCompleted: questionsCompleted
                    },
                    $set: {
                        username: username, // Ensure username is always set
                        lastMatchAt: endedAt || new Date(),
                        updatedAt: new Date()
                    }
                };

                // Handle win/loss/draw
                if (isWinner) {
                    updateObj.$inc.wins = 1;
                    updateObj.$inc.currentStreak = 1;
                    // Increment difficulty-specific wins
                    const difficultyWinField = `${player.selectedDifficulty}Wins`;
                    updateObj.$inc[difficultyWinField] = 1;
                } else if (isLoser) {
                    updateObj.$inc.losses = 1;
                    updateObj.$set.currentStreak = 0;
                } else if (isDraw) {
                    updateObj.$inc.draws = 1;
                }

                console.log(`[ArenaStats DEBUG] Updating stats for userId: ${player.userId}`);
                console.log('[ArenaStats DEBUG] Update filter:', { userId: player.userId });
                console.log('[ArenaStats DEBUG] Update object:', JSON.stringify(updateObj, null, 2));

                // Update player stats
                const result = await this.ArenaPlayerStats.updateOne(
                    { userId: player.userId },
                    updateObj,
                    { upsert: true }
                );

                console.log(`[ArenaStats DEBUG] Update result for userId ${player.userId}:`, result);

                // Calculate derived stats
                await this.updateArenaDerivedStats(player.userId);

                updates.push({
                    userId: player.userId,
                    updated: result.modifiedCount > 0 || result.upsertedCount > 0
                });
            }

            return updates;
        } catch (error) {
            console.error('[UserStatsService ERROR] updateArenaStats failed:', error);
            throw error;
        }
    }

    /**
     * Update derived arena stats (averages, win rate, best streak)
     * @param {string} userId - User ID
     */
    async updateArenaDerivedStats(userId) {
        try {
            const stats = await this.ArenaPlayerStats.findOne({ userId });
            if (!stats) return;

            const updates = {};

            // Calculate averages
            if (stats.totalMatches > 0) {
                updates.averageScore = Math.round((stats.totalScore / stats.totalMatches) * 100) / 100;
                updates.winRate = Math.round((stats.wins / stats.totalMatches) * 10000) / 100; // 2 decimal places
            }

            // Update best streak
            if (stats.currentStreak > stats.bestStreak) {
                updates.bestStreak = stats.currentStreak;
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
                await this.ArenaPlayerStats.updateOne(
                    { userId },
                    { $set: updates }
                );
            }
        } catch (error) {
            console.error('[UserStatsService Error] updateArenaDerivedStats failed:', error);
            throw error;
        }
    }

    /**
     * Get arena leaderboard
     * @param {number} limit - Number of users to return
     * @returns {Array} Array of arena stats sorted by wins
     */
    async getArenaLeaderboard(limit = 50) {
        try {
            // Sort by winRate DESC, then wins DESC, then totalScore DESC
            const leaderboard = await this.ArenaPlayerStats.find({})
                .sort({ winRate: -1, wins: -1, totalScore: -1 })
                .limit(limit)
                .select('userId username totalMatches wins losses draws winRate averageScore currentStreak bestStreak');

            // Assign rank based on sorted order
            return leaderboard.map((stats, idx) => ({
                rank: idx + 1,
                userId: stats.userId,
                username: stats.username,
                totalMatches: stats.totalMatches,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                winRate: stats.winRate,
                averageScore: stats.averageScore,
                currentStreak: stats.currentStreak,
                bestStreak: stats.bestStreak
            }));
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get arena leaderboard:', error);
            throw error;
        }
    }

    /**
     * Clean up stale arena matches and enforce 30-minute time limit
     * This prevents zombie matches and enforces the core arena rule: all matches end in 30 minutes max
     */
    async cleanupStaleMatches() {
        try {
            const ArenaMatch = mongoose.model("ArenaMatch");
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            
            // Find all matches that are still active but started more than 30 minutes ago
            const staleMatches = await ArenaMatch.find({
                status: { $in: ['waiting', 'in_progress'] },
                startedAt: { $lt: thirtyMinutesAgo }
            });

            let cleanedCount = 0;

            for (const match of staleMatches) {
                try {
                    // Calculate final scores based on current progress
                    const player1Score = match.player1.score || 0;
                    const player2Score = match.player2.score || 0;
                    
                    // Determine winner based on scores at timeout
                    let winner = null;
                    if (player1Score > player2Score) {
                        winner = match.player1.userId;
                    } else if (player2Score > player1Score) {
                        winner = match.player2.userId;
                    }
                    // If equal scores, it's a draw (winner stays null)

                    // End the match due to timeout
                    const updateResult = await ArenaMatch.updateOne(
                        { matchId: match.matchId },
                        {
                            $set: {
                                status: 'completed',
                                endedAt: new Date(),
                                endReason: 'timeout',
                                totalDuration: 30 * 60, // 30 minutes in seconds
                                winner: winner,
                                'player1.finalScore': player1Score,
                                'player2.finalScore': player2Score,
                                updatedAt: new Date()
                            }
                        }
                    );

                    if (updateResult.modifiedCount > 0) {
                        cleanedCount++;
                        
                        // Update player arena stats for both players
                        const matchData = {
                            player1: {
                                userId: match.player1.userId,
                                username: match.player1.username,
                                selectedDifficulty: match.player1.selectedDifficulty,
                                score: player1Score,
                                questionsCompleted: match.player1.questionsCompleted || 0,
                                bonusPoints: 0
                            },
                            player2: {
                                userId: match.player2.userId,
                                username: match.player2.username,
                                selectedDifficulty: match.player2.selectedDifficulty,
                                score: player2Score,
                                questionsCompleted: match.player2.questionsCompleted || 0,
                                bonusPoints: 0
                            },
                            winner: winner,
                            endedAt: new Date()
                        };

                        // Update arena stats
                        await this.updateArenaStats(matchData);
                        
                        console.log(`✅ [UserStatsService] Match ${match.matchId} ended due to 30-minute timeout. Winner: ${winner || 'Draw'}`);
                    }
                } catch (matchError) {
                    console.error(`❌ [UserStatsService] Error ending match ${match.matchId}:`, matchError);
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`[UserStatsService] Cleaned up ${cleanedCount} matches that exceeded 30-minute limit`);
            }
            
            return cleanedCount;
        } catch (error) {
            console.error('[UserStatsService Error] Failed to cleanup stale matches:', error);
            return 0;
        }
    }

    /**
     * Get arena system statistics with automatic 30-minute timeout enforcement
     * @returns {Object} Arena system stats
     */
    async getArenaSystemStats() {
        try {
            // Always run cleanup to enforce 30-minute rule (30% chance to reduce server load)
            if (Math.random() < 0.3) {
                await this.cleanupStaleMatches();
            }
            
            // If we have arena socket handler, use its real-time stats
            if (this.arenaSocketHandler) {
                const arenaStats = await this.arenaSocketHandler.getArenaStats();
                return {
                    onlinePlayersCount: arenaStats.onlineUsers || 0,
                    activeMatchesCount: arenaStats.activeMatches || 0,
                    totalMatchesCount: arenaStats.totalMatches || 0
                };
            }
            
            // Fallback to database queries if no socket handler
            const ArenaQueue = mongoose.model("ArenaQueue");
            const onlinePlayersCount = await ArenaQueue.countDocuments({});
            
            // Get active matches count (only in_progress, to match ArenaSocketHandler)
            const ArenaMatch = mongoose.model("ArenaMatch");
            const activeMatchesCount = await ArenaMatch.countDocuments({ 
                status: 'in_progress'
            });
            
            // Get total completed matches
            const totalMatchesCount = await ArenaMatch.countDocuments({ 
                status: 'completed' 
            });
            
            return {
                onlinePlayersCount,
                activeMatchesCount,
                totalMatchesCount
            };
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get arena system stats:', error);
            return {
                onlinePlayersCount: 0,
                activeMatchesCount: 0,
                totalMatchesCount: 0
            };
        }
    }

    /**
     * API endpoint to get arena system stats
     */
    async endpoint_getArenaSystemStats(req, res) {
        try {
            const stats = await this.getArenaSystemStats();
            res.json({ success: true, stats });
        } catch (error) {
            console.error('[UserStatsService] endpoint_getArenaSystemStats error:', error);
            res.status(500).json({ success: false, error: 'Failed to get arena system stats' });
        }
    }

    /**
     * Get user's rank position in the leaderboard
     * @param {string} userId - User ID
     * @returns {number} User's rank position (1-based)
     */
    async getUserRankPosition(userId) {
        try {
            // First get the target user's stats
            const targetUser = await UserDBHandler.Users.findOne({ userID: userId })
                .select('rank problemsSolved streak_count');
            
            if (!targetUser) {
                return 0; // User not found
            }

            const targetRank = targetUser.rank || 0;
            const targetProblems = targetUser.problemsSolved || 0;
            const targetStreak = targetUser.streak_count || 0;

            // Get all users with better stats (ordered the same way as leaderboard)
            const betterUsers = await UserDBHandler.Users.find({
                $or: [
                    // Users with higher rank points
                    { rank: { $gt: targetRank } },
                    
                    // Users with same rank points but more problems solved
                    { 
                        rank: targetRank, 
                        problemsSolved: { $gt: targetProblems } 
                    },
                    
                    // Users with same rank points and problems solved but higher streak
                    { 
                        rank: targetRank, 
                        problemsSolved: targetProblems,
                        streak_count: { $gt: targetStreak }
                    }
                ]
            }).sort({ 
                rank: -1, 
                problemsSolved: -1, 
                streak_count: -1, 
                userID: 1 
            });

            // Count users with identical stats (ties) that come before this user (by userID)
            const tiedUsers = await UserDBHandler.Users.find({
                rank: targetRank,
                problemsSolved: targetProblems,
                streak_count: targetStreak,
                userID: { $lt: userId } // Users with lexicographically smaller userID come first
            }).countDocuments();

            // Return 1-based position (1st place = 1, 2nd place = 2, etc.)
            return betterUsers.length + tiedUsers + 1;
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get user rank position:', error);
            return 0;
        }
    }

    /**
     * Get comprehensive user statistics including leaderboard rank position
     * @param {string} userId - User ID
     * @returns {Object} User stats object with rank position
     */
    async getUserStatsWithRankPosition(userId) {
        try {
            const [basicStats, rankPosition] = await Promise.all([
                this.getUserStats(userId),
                this.getUserRankPosition(userId)
            ]);

            return {
                ...basicStats,
                rankPosition: rankPosition // Actual position in leaderboard (1st, 2nd, 3rd, etc.)
            };
        } catch (error) {
            console.error('[UserStatsService Error] Failed to get user stats with rank position:', error);
            throw error;
        }
    }

    /**
     * API endpoint to get user's rank position in leaderboard
     */
    async endpoint_getUserRankPosition(req, res) {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const rankPosition = await this.getUserRankPosition(userId);
            res.json({ success: true, rankPosition });
        } catch (error) {
            console.error('[UserStatsService] endpoint_getUserRankPosition error:', error);
            res.status(500).json({ success: false, error: 'Failed to get user rank position' });
        }
    }
}

// Export the class and let the main server create the instance with dependencies
export { UserStatsService };
