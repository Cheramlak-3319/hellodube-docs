// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const AuthController = require("../controllers/authController");
const { validate } = require("../middleware/validator");
const rateLimit = require("express-rate-limit");

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    error: true,
    message: "Too many attempts. Please try again later.",
  },
});

// Validation rules
const registerValidation = [
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("terms").optional().isArray(),
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Routes
router.post(
  "/register",
  authLimiter,
  validate(registerValidation),
  AuthController.register,
);

router.post(
  "/login",
  authLimiter,
  validate(loginValidation),
  AuthController.login,
);

router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

module.exports = router;
