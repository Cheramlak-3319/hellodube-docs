const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Token = require("../models/Token");
const {
  AppError,
  ErrorTypes,
  catchAsync,
} = require("../middleware/errorHandler");

// 🔐 Generate Access & Refresh Tokens
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

// 💾 Save Refresh Token in DB
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
  // 📝 Register
  register = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, ErrorTypes.VALIDATION_ERROR);
    }

    const { firstName, lastName, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      throw new AppError(
        "User already exists",
        409,
        ErrorTypes.DUPLICATE_ERROR,
      );
    }

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

    res.status(201).json({
      error: false,
      user: user.profile,
      tokens,
    });
  });

  // 🔑 Login
  login = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400, ErrorTypes.VALIDATION_ERROR);
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError(
        "Invalid credentials",
        401,
        ErrorTypes.AUTHENTICATION_ERROR,
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(
        "Invalid credentials",
        401,
        ErrorTypes.AUTHENTICATION_ERROR,
      );
    }

    const tokens = generateTokens(user);

    await saveRefreshToken(
      user._id,
      tokens.refreshToken,
      req.ip,
      req.headers["user-agent"],
    );

    user.lastLogin = new Date();
    await user.save();

    res.json({
      error: false,
      user: user.profile,
      tokens,
    });
  });

  // 🔄 Refresh Token
  refresh = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        "Refresh token is required",
        400,
        ErrorTypes.VALIDATION_ERROR,
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError(
        "Invalid or expired refresh token",
        401,
        ErrorTypes.AUTHENTICATION_ERROR,
      );
    }

    const tokenDoc = await Token.findOne({
      token: refreshToken,
      userId: decoded.userId,
    });

    if (!tokenDoc) {
      throw new AppError(
        "Refresh token not found or revoked",
        403,
        ErrorTypes.AUTHORIZATION_ERROR,
      );
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      await Token.deleteOne({ _id: tokenDoc._id });

      throw new AppError("User not found", 404, ErrorTypes.NOT_FOUND_ERROR);
    }

    const tokens = generateTokens(user);

    await Token.deleteOne({ _id: tokenDoc._id });

    await saveRefreshToken(
      user._id,
      tokens.refreshToken,
      req.ip,
      req.headers["user-agent"],
    );

    res.status(200).json({
      error: false,
      message: "Tokens refreshed successfully",
      tokens,
    });
  });

  // 🚪 Logout
  logout = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        "Refresh token is required",
        400,
        ErrorTypes.VALIDATION_ERROR,
      );
    }

    await Token.deleteOne({ token: refreshToken });

    res.status(200).json({
      error: false,
      message: "Logged out successfully",
    });
  });

  // 🚪🚪 Logout All Devices
  logoutAll = catchAsync(async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401, ErrorTypes.AUTHENTICATION_ERROR);
    }

    const result = await Token.deleteMany({ userId });

    res.status(200).json({
      error: false,
      message: `Logged out from all devices (${result.deletedCount} sessions terminated)`,
    });
  });
}

module.exports = new AuthController();
