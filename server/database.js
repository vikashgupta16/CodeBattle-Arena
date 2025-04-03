const clerk = require("@clerk/express");
const mongoose = require("mongoose");

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
        admin: { type: Boolean, default: false }
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
                    console.log('No user');
                }
            } catch (error) {
                console.log("[UserDBHandler Error] userAuthMiddleWare failed to authenticate user", error);
            }
        }

        next();
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
}

module.exports = {
    MongooseConnect,
    UserDBHandler
};