const { Router } = require("express");
const authRouter = Router();
const authController = require('./auth.controller');

authRouter.post("/register", authController.validateUserRegistration, authController.registerPost);
authRouter.post('/login', authController.validateUserLogin, authController.logInPost);

module.exports = authRouter;