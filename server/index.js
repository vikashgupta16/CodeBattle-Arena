const express = require("express");
const dotenv = require("dotenv");
const clerk = require("@clerk/express");
const session = require("cookie-session");
const crypto = require("node:crypto");
const cors = require("cors");
const path = require("path");

const { MongooseConnect, UserDBHandler } = require("./database.js");
const { CodeRunner } = require("./codeRun.js");
const { ProblemDBHandler } = require("./problemDatabase.js");

// configure the environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.PORT = process.env.PORT || '8080';

// the main app instance
const app = express();

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
const problemDBHandler = new ProblemDBHandler();

// user database handler -------------
MongooseConnect.connect(process.env.MONGO_DB_URL);
const uDBHandler = new UserDBHandler();

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
app.get('/api/incstreak/:value/:set', clerk.requireAuth(), uDBHandler.endpoint_incrementStreakCount.bind(uDBHandler));
app.get('/api/inccontest/:value/:set', clerk.requireAuth(), uDBHandler.endpoint_incrementContestsCount.bind(uDBHandler));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await uDBHandler.getLeaderboard();
        res.json(users);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Problem endpoints
app.get('/api/problems', problemDBHandler.endpoint_getProblems.bind(problemDBHandler));
app.get('/api/problems/:problemId', problemDBHandler.endpoint_getProblem.bind(problemDBHandler));
app.post('/api/problems/:problemId/submit', 
    express.json({ limit: '10mb' }), 
    clerk.requireAuth(), 
    problemDBHandler.endpoint_submitSolution.bind(problemDBHandler)
);

app.get('/api/userdata', clerk.requireAuth(), uDBHandler.endpoint_userData.bind(uDBHandler));
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
app.listen(+process.env.PORT, () => {
    console.log(`Server live at http://localhost:${process.env.PORT}`);
});