require('dotenv').config();
const express = require("express");
const passport = require("passport");
require("./config/passport")(passport);
const cors = require('cors');
const authRouter = require("./modules/auth/auth.router");
const postRouter = require('./modules/posts/posts.router');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(passport.initialize());

app.use('/auth', authRouter);
app.use('/posts', postRouter);

module.exports = app;