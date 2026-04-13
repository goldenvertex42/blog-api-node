require('dotenv').config();
const express = require("express");
const passport = require("passport");
require("./config/passport")(passport);
const authRouter = require("./routes/authRouter");
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(passport.initialize());

app.use('/auth', authRouter);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
});
