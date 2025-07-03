import * as clerk from "@clerk/express";
import mongoose from "mongoose";

class MongooseConnect {
    static isConnected = false;

    static async connect(URI, force = false) {
        if (force) {
            MongooseConnect.isConnected = false;
        }

        if (!MongooseConnect.isConnected) {
            await mongoose.connect(URI);
            MongooseConnect.isConnected = true;
            console.log("[MongooseConnect INFO] Successfully connected to MongoDB!");
        }
    }
}

class UserDBHandler {
    static userSchema = new mongoose.Schema({
        userID: String,
        name: String,
        rank: { type: Number, default: 0 },
        contests_count: { type: Number, default: 0 },
        streak_count: { type: Number, default: 0 },
        admin: { type: Boolean, default: false },
        lastSolvedDate: { type: Date, default: null },
        problemsSolved: { type: Number, default: 0 },
        easyCount: { type: Number, default: 0 },
        mediumCount: { type: Number, default: 0 },
        hardCount: { type: Number, default: 0 }
    });

    static Users = mongoose.model("Users", UserDBHandler.userSchema);

    async middleware_userAuth(req, res, next) {
        if (!req.session.accountedFor) {
            req.session.accountedFor = true;

            try {
                const userDbStore = await UserDBHandler.Users.findOne({
                    userID: req.auth.userId
                });

                if (userDbStore === null) {
                    const userData = await clerk.clerkClient.users.getUser(req.auth.userId);
                    const userStore = new UserDBHandler.Users({
                        userID: req.auth.userId,
                        name: userData.username,
                        rank: 0,
                        contests_count: 0,
                        streak_count: 0,
                        admin: false
                    });

                    await userStore.save();
                }
            } catch (error) {
                console.log("[UserDBHandler Error] userAuthMiddleWare failed to authenticate user", error);
            }
        }

        next();
    }

    async endpoint_userData(req, res) {
        if (req?.auth?.userId) {
            const userData = await UserDBHandler.Users.findOne(
                { userID: req.auth.userId }, 
                { 
                    contests_count: 1, 
                    name: 1, 
                    rank: 1, 
                    streak_count: 1,
                    problemsSolved: 1,
                    easyCount: 1,
                    mediumCount: 1,
                    hardCount: 1,
                    lastSolvedDate: 1,
                    _id: 0 
                }
            );
            res.json(userData);
        }
        else {
            res.json({ error: "Failed to get user details" });
        }
    }

    /**
     * Get leaderboard data
     * @param {Request} req The request object
     * @param {Response} res The response object
     */
    async endpoint_getLeaderboard(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const leaderboard = await this.getLeaderboard(limit);
            
            // Add ranking positions
            const rankedLeaderboard = leaderboard.map((user, index) => ({
                ...user.toObject(),
                position: index + 1
            }));
            
            res.json({ 
                success: true, 
                leaderboard: rankedLeaderboard,
                totalUsers: rankedLeaderboard.length
            });
        } catch (error) {
            console.error('Leaderboard endpoint error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch leaderboard' 
            });
        }
    }

    /**
     * Requires the req object to contain the param[optional] set to make sure the rank is set and not incremented
     * @param {Request} req The request object
     * @param {Response} res The response object
     */
    async endpoint_incrementUserRank(req, res) {
        if (req.params.value) {
            try {
                this.incrementUserRank(req.auth.userId, req.params.value, req.params.set === "true");
                res.json({ message: 'ok' });
            } catch (err) {
                res.json({ error: err.toString() });
                return;
            }
        }
        else {
            res.json({ error: "Request parameter value missing" });
        }
    }

    async incrementUserRank(_userId, value, set = false) {
        if (set) {
            await UserDBHandler.Users.updateOne({ userID: _userId }, { $set: { rank: value } });
        }
        else {
            await UserDBHandler.Users.updateOne({ userID: _userId }, { $inc: { rank: value } });
        }
    }

    /**
     * Requires the req object to contain the param[optional] set to make sure the rank is set and not incremented
     * @param {Request} req The request object
     * @param {Response} res The response object
     */
    async endpoint_incrementStreakCount(req, res) {
        if (req.params.value) {
            try {
                this.incrementStreakCount(req.auth.userId, req.params.value, req.params.set === "true");
                res.json({ message: 'ok' });
            } catch (err) {
                res.json({ error: err.toString() });
                return;
            }
        }
        else {
            res.json({ error: "Request parameter value missing" });
        }
    }

    async incrementStreakCount(_userId, value, set = false) {
        if (set) {
            await UserDBHandler.Users.updateOne({ userID: _userId }, { $set: { streak_count: value } });
        }
        else {
            await UserDBHandler.Users.updateOne({ userID: _userId }, { $inc: { streak_count: value } });
        }
    }

    /**
     * Requires the req object to contain the param[optional] set to make sure the rank is set and not incremented
     * @param {Request} req The request object
     * @param {Response} res The response object
     */
    async endpoint_incrementContestsCount(req, res) {
        if (this.checkAdminUser(req.auth.userId) && req.params.value) {
            try {
                this.incrementContestsCount(req.auth.userId, req.params.value, req.params.set === "true");
                res.json({ message: 'ok' });
            } catch (err) {
                res.json({ error: err.toString() });
                return;
            }
        }
        else {
            res.json({ error: "Request parameter value missing" });
        }
    }

    async incrementContestsCount(_userId, value, set = false) {
        if (set) {
            await UserDBHandler.Users.updateOne({ userID: _userId }, { $set: { contests_count: value } });
        }
        else {
            await UserDBHandler.Users.updateOne({ userID: _userId }, { $inc: { contests_count: value } });
        }
    }

    /**
     * Check if user is admin
     * @param {string} userId User ID to check
     * @returns {boolean} True if user is admin
     */
    async checkAdminUser(userId) {
        try {
            const user = await UserDBHandler.Users.findOne({ userID: userId });
            return user?.admin || false;
        } catch (error) {
            console.error('[UserDBHandler Error] checkAdminUser failed:', error);
            return false;
        }
    }

    /**
     * Get leaderboard data
     * @param {number} limit Number of users to return (default: 50)
     * @returns {Array} Array of user objects sorted by rank
     */
    async getLeaderboard(limit = 50) {
        try {
            return await UserDBHandler.Users
                .find({}, { 
                    name: 1, 
                    userID: 1,
                    rank: 1, 
                    contests_count: 1, 
                    streak_count: 1, 
                    problemsSolved: 1,
                    easyCount: 1,
                    mediumCount: 1,
                    hardCount: 1,
                    lastSolvedDate: 1,
                    _id: 0 
                })
                .sort({ 
                    problemsSolved: -1, 
                    hardCount: -1, 
                    mediumCount: -1, 
                    easyCount: -1, 
                    lastSolvedDate: -1 
                })
                .limit(limit);
        } catch (error) {
            console.error('[UserDBHandler Error] getLeaderboard failed:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     * @param {string} userId User ID
     * @returns {Object} User stats
     */
    async getUserStats(userId) {
        try {
            return await UserDBHandler.Users.findOne(
                { userID: userId }, 
                { 
                    rank: 1, 
                    contests_count: 1, 
                    streak_count: 1, 
                    name: 1, 
                    problemsSolved: 1,
                    easyCount: 1,
                    mediumCount: 1,
                    hardCount: 1,
                    lastSolvedDate: 1,
                    _id: 0 
                }
            );
        } catch (error) {
            console.error('[UserDBHandler Error] getUserStats failed:', error);
            throw error;
        }
    }

    /**
     * Update user statistics when a problem is successfully solved
     * @param {string} userId User ID
     * @param {string} difficulty Problem difficulty (easy, medium, hard)
     * @param {string} category Problem category
     * @returns {Object} Updated user stats
     */
    async updateUserOnProblemSolved(userId, difficulty, category) {
        try {
            // Calculate rank points based on difficulty
            const rankPoints = {
                'easy': 10,
                'medium': 25,
                'hard': 50
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
            }

            // Update user data
            await UserDBHandler.Users.updateOne(
                { userID: userId },
                updateObj
            );

            // Handle streak separately
            await this.checkAndUpdateStreak(userId);

            // Return updated user stats
            return await this.getUserStats(userId);
        } catch (error) {
            console.error('[UserDBHandler Error] updateUserOnProblemSolved failed:', error);
            throw error;
        }
    }

    /**
     * API endpoint to update user stats on problem solve
     * @param {Request} req 
     * @param {Response} res 
     */
    async endpoint_updateOnProblemSolved(req, res) {
        try {
            const { difficulty, category } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            if (!difficulty) {
                return res.status(400).json({ success: false, error: 'Difficulty is required' });
            }

            const updatedStats = await this.updateUserOnProblemSolved(userId, difficulty, category);
            
            res.json({ 
                success: true, 
                message: 'Stats updated successfully',
                stats: updatedStats
            });
        } catch (error) {
            console.error('Update stats error:', error);
            res.status(500).json({ success: false, error: 'Failed to update stats' });
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
            console.error('[UserDBHandler Error] checkAndUpdateStreak failed:', error);
        }
    }

    /**
     * Migrate existing users to include new stats fields
     */
    async migrateUsersStats() {
        try {
            const result = await UserDBHandler.Users.updateMany(
                { problemsSolved: { $exists: false } },
                {
                    $set: {
                        problemsSolved: 0,
                        easyCount: 0,
                        mediumCount: 0,
                        hardCount: 0,
                        lastSolvedDate: null
                    }
                }
            );
            console.log(`[UserDBHandler] Migrated ${result.modifiedCount} users with new stats fields`);
        } catch (error) {
            console.error('[UserDBHandler Error] Migration failed:', error);
        }
    }

    /**
     * Update user stats directly (for migration/fix purposes)
     */
    async updateUserStats(userId, statsUpdate) {
        try {
            await UserDBHandler.Users.updateOne(
                { userID: userId },
                { $set: statsUpdate }
            );
            return true;
        } catch (error) {
            console.error(`[UserDBHandler Error] Failed to update stats for user ${userId}:`, error);
            throw error;
        }
    }
}

export {
    MongooseConnect,
    UserDBHandler
};