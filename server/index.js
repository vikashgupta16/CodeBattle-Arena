const express = require("express");
const dotenv = require("dotenv");

dotenv.config();
process.env.PORT = process.env.PORT || '8080';

const app = express();

app.use('/public', express.static('client'));

app.get('/', (req, res) => {
    res.redirect('/public/LandingPage');
});

app.listen(+process.env.PORT, () => {
    console.log(`Server live at http://localhost:${process.env.PORT}`);
});