// routes/verificationRoutes.js
const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");
const { body } = require("express-validator");
const { validate } = require("../middleware/validator");
const rateLimit = require("express-rate-limit");

// Rate limiter for verification endpoints
const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    error: true,
    message: "Too many verification attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const emailValidation = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
];

const verifyValidation = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("code")
    .isLength({ min: 6, max: 6 })
    .withMessage("6-digit code required")
    .isNumeric()
    .withMessage("Code must contain only numbers"),
];

// ==================== EMAIL VERIFICATION (REGISTRATION) ====================
router.post(
  "/send-email-code",
  verificationLimiter,
  validate(emailValidation),
  verificationController.sendEmailCode,
);

router.post(
  "/verify-email-code",
  verificationLimiter,
  validate(verifyValidation),
  verificationController.verifyEmailCode,
);

router.post(
  "/resend-email-code",
  verificationLimiter,
  validate(emailValidation),
  verificationController.resendEmailCode,
);

// ==================== OTP LOGIN ====================
router.post(
  "/send-login-otp",
  verificationLimiter,
  validate(emailValidation),
  verificationController.sendLoginOtp,
);

router.post(
  "/verify-login-otp",
  verificationLimiter,
  validate(verifyValidation),
  verificationController.verifyLoginOtp,
);

router.post(
  "/resend-login-otp",
  verificationLimiter,
  validate(emailValidation),
  verificationController.resendLoginOtp,
);

module.exports = router;
