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

  async refresh(req, res) {
    /* ... */
  }
  async logout(req, res) {
    /* ... */
  }
}

module.exports = new AuthController();
