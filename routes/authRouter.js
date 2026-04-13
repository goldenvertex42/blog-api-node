const { Router } = require("express");
const authRouter = Router();
const authController = require('../controllers/authController');

authRouter.post("/register", authController.validateUserRegistration, authController.registerPost);
authRouter.post('/login', authController.validateUserLogin, authController.logInPost);

module.exports = authRouter;