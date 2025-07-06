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
        hardCount: { type: Number, default: 0 },
        realWorldCount: { type: Number, default: 0 }
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
     * Migrate existing users to include new stats fields
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