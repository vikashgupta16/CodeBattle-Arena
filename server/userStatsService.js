import { UserDBHandler } from './database.js';

/**
 * Common User Statistics Service
 * Handles user stats logic for both homepage and leaderboard
 */
class UserStatsService {
    
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
     * Get leaderboard with user statistics
     * @param {number} limit - Number of users to return
     * @returns {Array} Array of user objects with stats
     */
    async getLeaderboard(limit = 50) {
        try {
            const users = await UserDBHandler.Users.find({})
                .sort({ rank: -1 })
                .limit(limit)
                .select('userID name problemsSolved easyCount mediumCount hardCount realWorldCount rank streak_count');

            return users.map(user => ({
                userID: user.userID,
                name: user.name, // Use 'name' to match frontend expectations
                problemsSolved: user.problemsSolved || 0,
                easyCount: user.easyCount || 0,
                mediumCount: user.mediumCount || 0,
                hardCount: user.hardCount || 0,
                realWorldCount: user.realWorldCount || 0,
                rank: user.rank || 0,
                streak_count: user.streak_count || 0
            }));
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
     * API endpoint for getting user stats
     */
    async endpoint_getUserStats(req, res) {
        try {
            const userId = req.auth?.userId;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            const stats = await this.getUserStats(userId);
            
            res.json({
                success: true,
                stats: stats
            });
        } catch (error) {
            console.error('[UserStatsService Error] endpoint_getUserStats failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user stats'
            });
        }
    }

    /**
     * API endpoint for getting leaderboard
     */
    async endpoint_getLeaderboard(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const leaderboard = await this.getLeaderboard(limit);
            
            res.json({
                success: true,
                leaderboard: leaderboard
            });
        } catch (error) {
            console.error('[UserStatsService Error] endpoint_getLeaderboard failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch leaderboard'
            });
        }
    }

    /**
     * API endpoint for updating user stats on problem solve
     */
    async endpoint_updateOnProblemSolved(req, res) {
        try {
            const { difficulty, category } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            if (!difficulty) {
                return res.status(400).json({
                    success: false,
                    error: 'Difficulty is required'
                });
            }

            const updatedStats = await this.updateUserOnProblemSolved(userId, difficulty, category);
            
            res.json({
                success: true,
                stats: updatedStats
            });
        } catch (error) {
            console.error('[UserStatsService Error] endpoint_updateOnProblemSolved failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update user stats'
            });
        }
    }

    /**
     * Endpoint for incrementing streak count (for compatibility)
     * @param {Request} req
     * @param {Response} res
     */
    async endpoint_incrementStreakCount(req, res) {
        try {
            await this.incrementStreakCount(req.auth.userId, req.params.value, req.params.set === "true");
            res.json({ success: true });
        } catch (error) {
            console.error('[UserStatsService Error] endpoint_incrementStreakCount failed:', error);
            res.status(500).json({ success: false, error: error.message });
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
}

// Create singleton instance
const userStatsService = new UserStatsService();

export { UserStatsService, userStatsService };
