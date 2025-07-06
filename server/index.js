import express from "express";
import dotenv from "dotenv";
import * as clerk from "@clerk/express";
import session from "cookie-session";
import crypto from "node:crypto";
import cors from "cors";
import path from "path";
import { createServer } from "http";

import { MongooseConnect, UserDBHandler } from "./database.js";
import { UserStatsService } from "./userStatsService.js";
import { CodeRunner } from "./codeRun.js";
import { ProblemDBHandler } from "./problemDatabase.js";
import { ArenaDBHandler } from "./arenaDatabase.js";
import { ArenaSocketHandler } from "./arenaSocket.js";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// configure the environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.PORT = process.env.PORT || '8080';

// the main app instance
const app = express();
const server = createServer(app);

// Initialize Arena Socket Handler
const arenaSocketHandler = new ArenaSocketHandler(server);

// Initialize User Stats Service with arena socket handler for real-time stats
const userStatsService = new UserStatsService(arenaSocketHandler);

// CORS middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// session handler ----------------
app.use(session({
    secret: crypto.randomBytes(32),
    maxAge: 24 * 60 * 60 * 1000     // 24 hour expiry
}));

// code runner handler ------------
const codeRunnerHandler = new CodeRunner();

// problem database handler -------
const problemDBHandler = new ProblemDBHandler(userStatsService);

// arena database handler ----------
const arenaDBHandler = new ArenaDBHandler(userStatsService);

// user database handler -------------
MongooseConnect.connect(process.env.MONGO_DB_URL);
const uDBHandler = new UserDBHandler();

// Run migration for existing users
uDBHandler.migrateUsersStats().catch(console.error);

// Run migration for real-world stats
userStatsService.migrateUsersForRealWorld().catch(console.error);

// Start periodic 30-minute match timeout enforcement (every 5 minutes)
setInterval(async () => {
    try {
        const cleanedCount = await userStatsService.cleanupStaleMatches();
        if (cleanedCount > 0) {
            console.log(`🔧 [Server] Periodic cleanup: ended ${cleanedCount} matches that exceeded 30-minute limit`);
        }
    } catch (error) {
        console.error('❌ [Server] Periodic match cleanup error:', error);
    }
}, 5 * 60 * 1000); // Every 5 minutes

// authentication -----------------
app.use(clerk.clerkMiddleware());

// base entry point of server
app.use('/public', express.static('client/public'));

app.use('/private', clerk.requireAuth({ signInUrl: process.env.CLERK_SIGN_IN_URL, signUpUrl: process.env.CLERK_SIGN_UP_URL }),
                    uDBHandler.middleware_userAuth.bind(uDBHandler),
                    express.static('client/private'));


// api endpoints -----------------

app.use('/api', express.json()); // Add JSON parsing middleware

// Re-enable essential endpoints
app.get('/api/incrank/:value/:set', clerk.requireAuth(), uDBHandler.endpoint_incrementUserRank.bind(uDBHandler));
app.get('/api/incstreak/:value/:set', clerk.requireAuth(), userStatsService.endpoint_incrementStreakCount.bind(userStatsService));
app.get('/api/inccontest/:value/:set', clerk.requireAuth(), uDBHandler.endpoint_incrementContestsCount.bind(uDBHandler));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Problem endpoints
app.get('/api/problems', problemDBHandler.endpoint_getProblems.bind(problemDBHandler));
app.get('/api/problems/:problemId', problemDBHandler.endpoint_getProblem.bind(problemDBHandler));
app.post('/api/problems/:problemId/submit', 
    express.json({ limit: '10mb' }), 
    clerk.requireAuth(), 
    problemDBHandler.endpoint_submitSolution.bind(problemDBHandler)
);

// User solved problems endpoint
app.get('/api/user/solved-problems', 
    clerk.requireAuth(), 
    problemDBHandler.endpoint_getUserSolvedProblems.bind(problemDBHandler)
);

// User stats endpoints
app.get('/api/userdata', clerk.requireAuth(), uDBHandler.endpoint_userData.bind(uDBHandler));

// New unified stats and leaderboard endpoints
app.get('/api/user/stats', clerk.requireAuth(), userStatsService.endpoint_getUserStats.bind(userStatsService));
app.get('/api/user/rank-position', clerk.requireAuth(), userStatsService.endpoint_getUserRankPosition.bind(userStatsService));
app.get('/api/leaderboard', userStatsService.endpoint_getLeaderboard.bind(userStatsService));
app.post('/api/user/problem-solved', 
    express.json(), 
    clerk.requireAuth(), 
    userStatsService.endpoint_updateOnProblemSolved.bind(userStatsService)
);

// Arena endpoints - now unified through UserStatsService
app.get('/api/arena/stats', clerk.requireAuth(), userStatsService.endpoint_getArenaStats.bind(userStatsService));
app.get('/api/arena/leaderboard', userStatsService.endpoint_getArenaLeaderboard.bind(userStatsService));
app.get('/api/arena/system-stats', userStatsService.endpoint_getArenaSystemStats.bind(userStatsService));

app.get('/api/arena/player-stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = await arenaDBHandler.getPlayerStats(userId);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get player stats' });
    }
});

app.post('/api/run/:lang', express.json(), codeRunnerHandler.endpoint.bind(codeRunnerHandler));

// main redirect
app.get('/', (req, res) => {
    res.redirect('/public/LandingPage/');
});

// Landing page direct access
app.get('/LandingPage', (req, res) => {
    res.redirect('/public/LandingPage/');
});

// http listen on PORT
server.listen(+process.env.PORT, () => {
    console.log(`Server live at http://localhost:${process.env.PORT}`);
});