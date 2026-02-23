const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Token = require("../models/Token");

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
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: true, errors: errors.array() });

      const { firstName, lastName, email, password, role } = req.body;
      const exists = await User.findOne({ email });
      if (exists)
        return res
          .status(409)
          .json({ error: true, message: "User already exists" });

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role,
      });
      const tokens = generateTokens(user);
      await saveRefreshToken(
        user._id,
        tokens.refreshToken,
        req.ip,
        req.headers["user-agent"],
      );

      user.lastLogin = new Date();
      await user.save();

      res.status(201).json({ error: false, user: user.profile, tokens });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: true, message: "Registration failed" });
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ error: true, errors: errors.array() });

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");
      if (!user)
        return res
          .status(401)
          .json({ error: true, message: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res
          .status(401)
          .json({ error: true, message: "Invalid credentials" });

      const tokens = generateTokens(user);
      await saveRefreshToken(
        user._id,
        tokens.refreshToken,
        req.ip,
        req.headers["user-agent"],
      );

      user.lastLogin = new Date();
      await user.save();

      res.json({ error: false, user: user.profile, tokens });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: true, message: "Login failed" });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: true,
          message: "Refresh token is required",
        });
      }

      // Verify the refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({
          error: true,
          message: "Invalid or expired refresh token",
        });
      }

      // Check if refresh token exists in database
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

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        // Clean up orphaned token
        await Token.deleteOne({ _id: tokenDoc._id });
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Remove old refresh token and save new one
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

  /**
   * Logout user - invalidate refresh token
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: true,
          message: "Refresh token is required",
        });
      }

      // Remove the refresh token from database
      const result = await Token.deleteOne({ token: refreshToken });

      if (result.deletedCount === 0) {
        // Token not found - still return success for security
        // (don't reveal if token existed or not)
        console.log("Logout attempted with non-existent token");
      }

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

  /**
   * Logout from all devices - invalidate all refresh tokens for user
   */
  async logoutAll(req, res) {
    try {
      const { userId } = req.body;

      if (!userId && !req.user?.userId) {
        return res.status(400).json({
          error: true,
          message: "User ID is required",
        });
      }

      const targetUserId = userId || req.user.userId;

      // Remove all refresh tokens for this user
      const result = await Token.deleteMany({ userId: targetUserId });

      return res.status(200).json({
        error: false,
        message: `Logged out from all devices (${result.deletedCount} sessions terminated)`,
      });
    } catch (err) {
      console.error("Logout all error:", err);
      return res.status(500).json({
        error: true,
        message: "Failed to logout from all devices",
      });
    }
  }
}

module.exports = new AuthController();
