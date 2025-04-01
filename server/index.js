const express = require("express");
const dotenv = require("dotenv");
const clerk = require("@clerk/express");

// configure the environment variables
dotenv.config();
process.env.PORT = process.env.PORT || '8080';

// the main app instance
const app = express();

// authentication -----------------
app.use(clerk.clerkMiddleware());

// base entry point of server
app.use('/public', express.static('client'));

app.use('/private', clerk.requireAuth({ signInUrl: process.env.CLERK_SIGN_IN_URL, signUpUrl: process.env.CLERK_SIGN_UP_URL }), (req, res) => {
    console.log("This is a protected route");
});
app.use('/public', express.static('client/public'));

app.use('/private', clerk.requireAuth({ signInUrl: process.env.CLERK_SIGN_IN_URL, signUpUrl: process.env.CLERK_SIGN_UP_URL }), express.static('client/private'));

// main redirect
app.get('/', (req, res) => {
    res.redirect('/public/LandingPage');
});

// http listen on PORT
app.listen(+process.env.PORT, () => {
    console.log(`Server live at http://localhost:${process.env.PORT}`);
});