const express = require("express");
const dotenv = require("dotenv");
const clerk = require("@clerk/express");
const session = require("cookie-session");
const crypto = require("node:crypto");

const { MongooseConnect, UserDBHandler } = require("./database.js");
const { CodeRunner } = require("./codeRun.js");

// configure the environment variables
dotenv.config();
process.env.PORT = process.env.PORT || '8080';

// the main app instance
const app = express();

// session handler ----------------
app.use(session({
    secret: crypto.randomBytes(32),
    maxAge: 24 * 60 * 60 * 1000     // 24 hour expiry
}));

// code runner handler ------------
const codeRunnerHandler = new CodeRunner();

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

app.use('/api', clerk.requireAuth());

// disabled endpoints to control user status
// app.get('/api/incrank/:value/:set', uDBHandler.endpoint_incrementUserRank.bind(uDBHandler));
// app.get('/api/incstreak/:value/:set', uDBHandler.endpoint_incrementStreakCount.bind(uDBHandler));
// app.get('/api/inccontest/:value/:set', uDBHandler.endpoint_incrementContestsCount.bind(uDBHandler));

app.get('/api/userdata', uDBHandler.endpoint_userData.bind(uDBHandler));
app.post('/api/run/:lang', express.json(), codeRunnerHandler.endpoint.bind(codeRunnerHandler));

// main redirect
app.get('/', (req, res) => {
    res.redirect('/public/LandingPage');
});

// http listen on PORT
app.listen(+process.env.PORT, () => {
    console.log(`Server live at http://localhost:${process.env.PORT}`);
});