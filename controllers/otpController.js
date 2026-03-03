// controllers/otpController.js
const Otp = require("../models/Otp");
const User = require("../models/User");
const Token = require("../models/Token");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

// Helper to generate JWT tokens (same as authController)
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

class OtpController {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Request OTP
  async requestOTP(req, res) {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });

      // Don't reveal if user exists or not for security
      // We'll still send OTP if user exists in our system

      // Generate OTP
      const otp = this.generateOTP();

      // Delete any existing OTP for this email
      await Otp.deleteMany({ email, verified: false });

      // Save new OTP
      const otpRecord = new Otp({
        email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      await otpRecord.save();

      // Send email with OTP
      try {
        await transporter.sendMail({
          from: `"HellOOpass" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your One-Time Password (OTP)",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #00a884;">HellOOpass</h1>
                <p style="color: #666;">One-Time Password Login</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="font-size: 16px; color: #333;">Your OTP is:</p>
                <div style="background: #ffffff; padding: 15px; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0072ce; border: 2px dashed #00a884;">
                  ${otp}
                </div>
                <p style="font-size: 14px; color: #dc3545; margin-top: 15px;">
                  This code will expire in 5 minutes
                </p>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center;">
                <p>If you didn't request this, please ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} HellOOpass. All rights reserved.</p>
              </div>
            </div>
          `,
        });

        console.log(`✅ OTP sent to ${email}`);

        // For security, don't send OTP in response
        res.status(200).json({
          success: true,
          message: "OTP sent successfully",
          expiresIn: 300, // 5 minutes in seconds
        });
      } catch (emailError) {
        console.error("❌ Failed to send OTP email:", emailError);

        // Delete the OTP record if email fails
        await Otp.deleteOne({ _id: otpRecord._id });

        return res.status(500).json({
          error: true,
          message: "Failed to send OTP email. Please try again.",
        });
      }
    } catch (error) {
      console.error("❌ OTP request error:", error);
      res.status(500).json({
        error: true,
        message: "Failed to process OTP request",
      });
    }
  }

  // Verify OTP and login
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      // Find valid OTP
      const otpRecord = await Otp.findOne({
        email,
        otp,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otpRecord) {
        return res.status(401).json({
          error: true,
          message: "Invalid or expired OTP",
        });
      }

      // Check attempts (max 3 attempts)
      if (otpRecord.attempts >= 3) {
        await Otp.deleteOne({ _id: otpRecord._id });
        return res.status(429).json({
          error: true,
          message: "Too many failed attempts. Please request a new OTP.",
        });
      }

      // Mark as verified (prevents reuse)
      otpRecord.verified = true;
      await otpRecord.save();

      // Find or create user
      let user = await User.findOne({ email });

      if (!user) {
        // Auto-register new user (optional - you can change this behavior)
        user = await User.create({
          firstName: email.split("@")[0],
          lastName: "User",
          email,
          password: require("crypto").randomBytes(20).toString("hex"), // Random password
          role: "pending",
          status: "pending",
          emailVerified: true,
          emailVerifiedAt: new Date(),
        });

        console.log(`🆕 New user auto-created via OTP: ${email}`);
      }

      // Check if account is active
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
      await Otp.deleteOne({ _id: otpRecord._id });

      console.log(`✅ User logged in via OTP: ${email}`);

      res.json({
        success: true,
        message: "Login successful",
        user: user.profile,
        tokens,
        // Include pending status message if needed
        ...(user.status === "pending" && {
          pending: true,
          message:
            "Your account is pending admin approval. You'll have limited access.",
        }),
      });
    } catch (error) {
      console.error("❌ OTP verification error:", error);
      res.status(500).json({
        error: true,
        message: "Failed to verify OTP",
      });
    }
  }

  // Resend OTP (convenience method)
  async resendOTP(req, res) {
    try {
      const { email } = req.body;

      // Delete old OTPs
      await Otp.deleteMany({ email, verified: false });

      // Generate and send new OTP
      return this.requestOTP(req, res);
    } catch (error) {
      console.error("❌ OTP resend error:", error);
      res.status(500).json({
        error: true,
        message: "Failed to resend OTP",
      });
    }
  }
}

module.exports = new OtpController();
