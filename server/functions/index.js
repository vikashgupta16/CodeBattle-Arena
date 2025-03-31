const express = require("express");
const serverless = require("serverless-http");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// public file server
app.use("/public", express.static("client"));

app.get('/', (req, res) => {
    res.redirect('/public/LandingPage');
});

module.exports.handler = serverless(app);