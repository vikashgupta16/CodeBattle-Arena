import express from "express";
import dotenv from "dotenv";
import * as clerk from "@clerk/express";
import session from "cookie-session";
import crypto from "node:crypto";
import cors from "cors";
import path from "path";
import { createServer } from "http";

import { MongooseConnect, UserDBHandler } from "./database.js";
import { CodeRunner } from "./codeRun.js";
import { ProblemDBHandler } from "./problemDatabase.js";
import { ArenaDBHandler } from "./arenaDatabase.js";
import { ArenaSocketHandler } from "./arenaSocket.js";
import { AIAssistanceService } from "./aiAssistance.js";
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

// arena database handler ----------
const arenaDBHandler = new ArenaDBHandler();

// AI assistance handler -----------
const aiAssistanceService = new AIAssistanceService();

// user database handler -------------
MongooseConnect.connect(process.env.MONGO_DB_URL);
const uDBHandler = new UserDBHandler();

// Run migration for existing users
uDBHandler.migrateUsersStats().catch(console.error);

// authentication -----------------
app.use(clerk.clerkMiddleware());

// base entry point of server
app.use('/public', express.static('client/public'));

// Serve test file (remove in production)
app.use('/test-stats.html', express.static('test-stats.html'));

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
app.get('/api/leaderboard', uDBHandler.endpoint_getLeaderboard.bind(uDBHandler));
app.post('/api/user/problem-solved', 
    express.json(), 
    clerk.requireAuth(), 
    uDBHandler.endpoint_updateOnProblemSolved.bind(uDBHandler)
);

// Arena endpoints
app.get('/api/arena/stats', async (req, res) => {
    try {
        const stats = await arenaSocketHandler.getArenaStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get arena stats' });
    }
});

app.get('/api/arena/leaderboard', async (req, res) => {
    try {
        const leaderboard = await arenaDBHandler.getArenaLeaderboard();
        res.json({ success: true, leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get arena leaderboard' });
    }
});

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

// AI Assistance endpoints
app.post('/api/ai/analyze-code', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const { code, language, problem, currentLine } = req.body;
        
        if (!code || !language) {
            return res.status(400).json({ 
                success: false, 
                error: 'Code and language are required' 
            });
        }

        const analysis = await aiAssistanceService.analyzeCodeLine(code, language, problem, currentLine);
        res.json({ success: true, analysis });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'AI analysis failed' 
        });
    }
});

app.post('/api/ai/code-completion', express.json(), async (req, res) => {
    try {
        const { code, language, cursorLine, cursorColumn } = req.body;
        
        if (!code || !language || cursorLine === undefined || cursorColumn === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Code, language, and cursor position are required' 
            });
        }

        const completions = await aiAssistanceService.getCodeCompletion(code, language, cursorLine, cursorColumn);
        res.json({ success: true, completions });
    } catch (error) {
        console.error('Code Completion Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Code completion failed' 
        });
    }
});

app.post('/api/ai/suggest-fix', express.json(), async (req, res) => {
    try {
        const { code, language, errorMessage } = req.body;
        
        if (!code || !language || !errorMessage) {
            return res.status(400).json({ 
                success: false, 
                error: 'Code, language, and error message are required' 
            });
        }

        const fixSuggestion = await aiAssistanceService.suggestFix(code, language, errorMessage);
        res.json({ success: true, fixSuggestion });
    } catch (error) {
        console.error('Fix Suggestion Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fix suggestion failed' 
        });
    }
});

app.get('/api/ai/language-tips/:language', async (req, res) => {
    try {
        const { language } = req.params;
        const tips = aiAssistanceService.getLanguageTips(language);
        res.json({ success: true, tips });
    } catch (error) {
        console.error('Language Tips Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get language tips' 
        });
    }
});

// Enhanced AI Assistance endpoints for real-time per-line help
app.post('/api/ai/real-time-analysis', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const { code, currentLine, currentLineText, language, problem } = req.body;
        
        if (!code || currentLine === undefined || !language) {
            return res.status(400).json({ 
                success: false, 
                error: 'Code, currentLine, and language are required' 
            });
        }

        const analysis = await aiAssistanceService.performRealTimeAnalysis(
            code, currentLine, currentLineText, language, problem
        );
        res.json(analysis);
    } catch (error) {
        console.error('Real-time Analysis Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Real-time analysis failed' 
        });
    }
});

app.post('/api/ai/contextual-help', express.json(), async (req, res) => {
    try {
        const { line, token, cursor, language, problem } = req.body;
        
        if (!line || !language || !cursor) {
            return res.status(400).json({ 
                success: false, 
                error: 'Line, language, and cursor position are required' 
            });
        }

        const help = await aiAssistanceService.getContextualHelp(line, token, cursor, language, problem);
        res.json(help);
    } catch (error) {
        console.error('Contextual Help Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Contextual help failed' 
        });
    }
});

app.post('/api/ai/analyze-test-failure', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const { code, language, problem, testResults } = req.body;
        
        if (!code || !language || !testResults) {
            return res.status(400).json({ 
                success: false, 
                error: 'Code, language, and test results are required' 
            });
        }

        const analysis = await aiAssistanceService.analyzeTestCaseFailure(code, language, problem, testResults);
        res.json(analysis);
    } catch (error) {
        console.error('Test Failure Analysis Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Test failure analysis failed' 
        });
    }
});

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