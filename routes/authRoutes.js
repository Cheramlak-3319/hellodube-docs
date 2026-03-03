// routes/verificationRoutes.js
const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");
const { body } = require("express-validator");
const { validate } = require("../middleware/validator");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Token = require("../models/Token");
const Verification = require("../models/Verification");

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

// Helper to generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "3d" },
  );
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
  return { accessToken, refreshToken };
};

// Helper to save refresh token
const saveRefreshToken = async (userId, token, ip, agent) => {
  await Token.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: ip,
    userAgent: agent,
  });
};

// ==================== OTP LOGIN ROUTES ====================

/**
 * @route   POST /api/verification/send-otp
 * @desc    Send OTP for login
 * @access  Public
 */
router.post(
  "/send-otp",
  verificationLimiter,
  validate(emailValidation),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user exists (optional - you can allow auto-registration)
      const user = await User.findOne({ email });

      // Reuse your existing sendEmailCode method
      // Just pass a different type
      req.body.type = "login-otp";

      // Call your existing sendEmailCode method
      return verificationController.sendEmailCode(req, res);
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({
        error: true,
        message: "Failed to send OTP",
      });
    }
  },
);

/**
 * @route   POST /api/verification/verify-otp
 * @desc    Verify OTP and login
 * @access  Public
 */
router.post(
  "/verify-otp",
  verificationLimiter,
  validate(verifyValidation),
  async (req, res) => {
    try {
      const { email, code } = req.body;

      // First, verify the OTP using your existing system
      const verification = await Verification.findOne({
        email,
        type: "login-otp", // Use a different type for login
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!verification) {
        return res.status(401).json({
          error: true,
          message: "Invalid or expired OTP",
        });
      }

      // Check attempts
      if (verification.attempts >= 3) {
        await Verification.deleteOne({ _id: verification._id });
        return res.status(429).json({
          error: true,
          message: "Too many failed attempts. Please request a new OTP.",
        });
      }

      // Verify code
      if (verification.code !== code) {
        verification.attempts += 1;
        await verification.save();

        const attemptsLeft = 3 - verification.attempts;
        return res.status(401).json({
          error: true,
          message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left.`,
        });
      }

      // Mark as verified
      verification.verified = true;
      await verification.save();

      // Find or create user
      let user = await User.findOne({ email });

      if (!user) {
        // Auto-register new user (optional - remove if you don't want auto-registration)
        user = await User.create({
          firstName: email.split("@")[0],
          lastName: "User",
          email,
          password: require("crypto").randomBytes(20).toString("hex"),
          role: "pending",
          status: "pending",
          emailVerified: true,
          emailVerifiedAt: new Date(),
        });
        console.log(`🆕 New user auto-created via OTP: ${email}`);
      }

      // Check if account is active or pending
      if (user.status !== "active" && user.status !== "pending") {
        return res.status(403).json({
          error: true,
          message: "Your account is not active. Please contact support.",
        });
      }

      // Generate tokens
      const tokens = generateTokens(user);

      // Save refresh token
      await saveRefreshToken(
        user._id,
        tokens.refreshToken,
        req.ip,
        req.headers["user-agent"],
      );

      // Update user login info
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // Delete used OTP
      await Verification.deleteOne({ _id: verification._id });

      console.log(`✅ User logged in via OTP: ${email}`);

      res.json({
        success: true,
        message: "Login successful",
        user: user.profile,
        tokens,
        ...(user.status === "pending" && {
          pending: true,
          message: "Your account is pending admin approval.",
        }),
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({
        error: true,
        message: "Failed to verify OTP",
      });
    }
  },
);

/**
 * @route   POST /api/verification/resend-otp
 * @desc    Resend OTP for login
 * @access  Public
 */
router.post(
  "/resend-otp",
  verificationLimiter,
  validate(emailValidation),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Delete old OTPs
      await Verification.deleteMany({
        email,
        type: "login-otp",
        verified: false,
      });

      // Reuse your existing sendEmailCode method
      req.body.type = "login-otp";
      return verificationController.sendEmailCode(req, res);
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({
        error: true,
        message: "Failed to resend OTP",
      });
    }
  },
);

// Keep your existing routes
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

module.exports = router;
