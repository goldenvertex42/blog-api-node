const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const { body, validationResult } = require("express-validator");

const validateUserRegistration = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom(async (value) => {
      const email = await prisma.user.findUnique({
        where: { email: value },
      });
      if (email) {
        throw new Error('Account with this email already exists');
      }
    }),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isAlphanumeric().withMessage('Username can only contain letters and numbers')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters long')
    .custom(async (value) => {
      const user = await prisma.user.findUnique({
        where: { username: value },
      });
      if (user) {
        throw new Error('Username already in use');
      }
    }),
  body('password')
    .isLength({ min: 8 }).withMessage('At least 8 characters')
    .matches(/[A-Z]/).withMessage('At least one uppercase letter')
    .matches(/[a-z]/).withMessage('At least one lowercase letter')
    .matches(/[0-9]/).withMessage('At least one number')
    .matches(/[\W_]/).withMessage('At least one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body("adminCode")
  .optional({ checkFalsy: true })
  .custom((value) => {
    if (value && value !== process.env.ADMIN_SECRET_CODE) {
      throw new Error("Invalid Admin Code. Please check your credentials or register as a Reader.");
    }
    return true;
  }),
];

const validateUserLogin = [
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password cannot be blank')
];

async function registerPost(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { email, password, username, firstName, lastName, adminCode } = req.body;
  
  const isAuthor = Boolean(adminCode && adminCode === process.env.ADMIN_SECRET_CODE);
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        username, 
        firstName, 
        lastName, 
        isAuthor: isAuthor 
      }
    });

    res.json({ 
      message: isAuthor ? "Author account created!" : "Reader account created!", 
      user: { id: user.id, username: user.username, isAuthor: user.isAuthor } 
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Email or Username already exists." });
    }
    res.status(500).json({ error: "Could not create user." });
  }
}

async function logInPost(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.status(400).json({
        message: info ? info.message : "Login failed",
        user: user,
      });
    }

    req.login(user, { session: false }, (err) => {
      if (err) res.send(err);

      // 1. Define the payload (what the frontend needs to know)
      const payload = {
        id: user.id,
        username: user.username,
        isAuthor: user.isAuthor, // Critical for your Author app!
      };

      // 2. Sign the token
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      // 3. Send token and user info back to React
      return res.json({ user: payload, token });
    });
  })(req, res);
}

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  registerPost,
  logInPost
}