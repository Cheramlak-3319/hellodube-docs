// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Token = require("../models/Token");
const Verification = require("../models/Verification");

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

const saveRefreshToken = async (userId, token, ip, agent) => {
  await Token.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: ip,
    userAgent: agent,
  });
};

class AuthController {
  // Register with email verification
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: true, errors: errors.array() });
      }

      const { firstName, lastName, email, password, terms } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(409).json({
          error: true,
          message: "Email already registered",
        });
      }

      // Verify email
      const emailVerification = await Verification.findOne({
        email,
        type: "email",
        verified: true,
      });

      if (!emailVerification) {
        return res.status(400).json({
          error: true,
          message: "Email not verified",
        });
      }

      // Create user (pending approval)
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role: "pending",
        status: "pending",
        emailVerified: true,
        emailVerifiedAt: emailVerification.createdAt,
        acceptedTerms: terms || [],
        termsAcceptedAt: new Date(),
      });

      // Clean up verification record
      await Verification.deleteOne({ email, type: "email" });

      console.log(`New user registered (pending): ${email}`);

      res.status(201).json({
        error: false,
        message:
          "Registration successful. Your account is pending admin approval.",
        user: user.profile,
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({
        error: true,
        message: "Registration failed",
      });
    }
  }

  // Login
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: true, errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res
          .status(401)
          .json({ error: true, message: "Invalid credentials" });
      }

      // 🟢 FIXED: Allow admins to login even if pending
      // Admin emails that should always be able to login
      const adminEmails = [
        "admin@dube.com",
        "kristalwos@gmail.com",
        "michaeltesfaye2013@gmail.com",
        "cheemanbest@gmail.com",
        "zelalemsame@gmail.com",
      ];

      // If user is not active AND not in admin list, block them
      if (user.status !== "active" && !adminEmails.includes(user.email)) {
        return res.status(403).json({
          error: true,
          message:
            "Your account is pending approval. Please wait for admin activation.",
          status: user.status,
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ error: true, message: "Invalid credentials" });
      }

      const tokens = generateTokens(user);
      await saveRefreshToken(
        user._id,
        tokens.refreshToken,
        req.ip,
        req.headers["user-agent"],
      );

      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      console.log(`User logged in: ${email} (${user.role})`);

      res.json({
        error: false,
        user: user.profile,
        tokens,
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: true, message: "Login failed" });
    }
  }

  // Refresh token
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: true,
          message: "Refresh token is required",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({
          error: true,
          message: "Invalid or expired refresh token",
        });
      }

      const tokenDoc = await Token.findOne({
        token: refreshToken,
        userId: decoded.userId,
      });

      if (!tokenDoc) {
        return res.status(403).json({
          error: true,
          message: "Refresh token not found or revoked",
        });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        await Token.deleteOne({ _id: tokenDoc._id });
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }

      const tokens = generateTokens(user);

      await Token.deleteOne({ _id: tokenDoc._id });
      await saveRefreshToken(
        user._id,
        tokens.refreshToken,
        req.ip,
        req.headers["user-agent"],
      );

      return res.status(200).json({
        error: false,
        message: "Tokens refreshed successfully",
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (err) {
      console.error("Refresh token error:", err);
      return res.status(500).json({
        error: true,
        message: "Failed to refresh token",
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: true,
          message: "Refresh token is required",
        });
      }

      await Token.deleteOne({ token: refreshToken });

      return res.status(200).json({
        error: false,
        message: "Logged out successfully",
      });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        error: true,
        message: "Failed to logout",
      });
    }
  }
}

module.exports = new AuthController();
