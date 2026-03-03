// controllers/verificationController.js
const Verification = require("../models/Verification");
const User = require("../models/User");
const Token = require("../models/Token"); // Add this for JWT tokens
const jwt = require("jsonwebtoken"); // Add this for JWT
const nodemailer = require("nodemailer");

// Email configuration with better error handling
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // ⚠️ MUST BE 465
  secure: true, // ⚠️ MUST BE true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certs
    ciphers: "SSLv3",
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

// Helper to generate JWT tokens (copy from authController)
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

class VerificationController {
  constructor() {
    this.sendEmailCode = this.sendEmailCode.bind(this);
    this.verifyEmailCode = this.verifyEmailCode.bind(this);
    this.resendEmailCode = this.resendEmailCode.bind(this);
    // Add new OTP methods
    this.sendLoginOtp = this.sendLoginOtp.bind(this);
    this.verifyLoginOtp = this.verifyLoginOtp.bind(this);
    this.resendLoginOtp = this.resendLoginOtp.bind(this);
  }

  // Generate 6-digit code
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ==================== EXISTING METHODS (for registration) ====================

  async sendEmailCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: true,
          message: "Email is required",
        });
      }

      // Check if email already exists and is verified
      const existingUser = await User.findOne({ email, emailVerified: true });
      if (existingUser) {
        return res.status(409).json({
          error: true,
          message: "Email already registered and verified",
        });
      }

      // Generate code
      const code = this.generateCode();

      // Delete any existing verification for this email
      await Verification.findOneAndDelete({ email, type: "email" });

      // Save new verification
      const verification = new Verification({
        email,
        code,
        type: "email",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      await verification.save();

      // Send email
      try {
        await transporter.sendMail({
          from: `"HellOOpass" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Verify Your Email Address",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #00a884;">HellOOpass</h1>
                <p style="color: #666;">Email Verification</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="font-size: 16px; color: #333;">Your verification code is:</p>
                <div style="background: #ffffff; padding: 15px; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0072ce; border: 2px dashed #00a884;">
                  ${code}
                </div>
                <p style="font-size: 14px; color: #dc3545; margin-top: 15px;">
                  This code will expire in 10 minutes
                </p>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center;">
                <p>If you didn't request this, please ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} HellOOpass. All rights reserved.</p>
              </div>
            </div>
          `,
        });

        console.log(`✅ Verification email sent to ${email}`);

        return res.status(200).json({
          success: true,
          message: "Verification code sent to your email",
          expiresIn: 600, // 10 minutes in seconds
        });
      } catch (emailError) {
        console.error("❌ Failed to send email:", emailError);
        return res.status(500).json({
          error: true,
          message: "Failed to send verification email. Please try again.",
        });
      }
    } catch (error) {
      console.error("Send code error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to send verification code",
      });
    }
  }

  async verifyEmailCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          error: true,
          message: "Email and verification code are required",
        });
      }

      // Find verification record
      const verification = await Verification.findOne({
        email,
        type: "email",
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!verification) {
        return res.status(400).json({
          error: true,
          message: "Invalid or expired verification code",
        });
      }

      // Verify code
      if (verification.code !== code) {
        verification.attempts += 1;
        await verification.save();

        const attemptsLeft = 3 - verification.attempts;
        return res.status(400).json({
          error: true,
          message: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left.`,
        });
      }

      // Mark as verified
      verification.verified = true;
      await verification.save();

      console.log(`✅ Email verified successfully: ${email}`);

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
        verified: true,
      });
    } catch (error) {
      console.error("Verify code error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to verify code",
      });
    }
  }

  async resendEmailCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: true,
          message: "Email is required",
        });
      }

      // Delete old verification
      await Verification.findOneAndDelete({ email, type: "email" });

      // Send new code
      return this.sendEmailCode(req, res);
    } catch (error) {
      console.error("Resend code error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to resend code",
      });
    }
  }

  // ==================== NEW METHODS FOR OTP LOGIN ====================

  async sendLoginOtp(req, res) {
    try {
      const { email } = req.body;
      console.log("📧 sendLoginOtp called for:", email);

      if (!email) {
        return res.status(400).json({
          error: true,
          message: "Email is required",
        });
      }

      // Generate code
      const code = this.generateCode();
      console.log("🔢 Generated code:", code);

      // Delete any existing OTP
      await Verification.findOneAndDelete({ email, type: "login-otp" });

      // Save new OTP
      const verification = new Verification({
        email,
        code,
        type: "login-otp",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await verification.save();
      console.log("💾 Saved new OTP to DB");

      // Send email via port 465
      try {
        const info = await transporter.sendMail({
          from: `"HellOOpass" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your Login OTP",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #00a884;">HellOOpass</h1>
              <p style="color: #666;">Login Verification</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="font-size: 16px; color: #333;">Your login OTP is:</p>
              <div style="background: #ffffff; padding: 15px; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0072ce; border: 2px dashed #00a884;">
                ${code}
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

        console.log(`✅ Login OTP sent to ${email}`, info.messageId);

        return res.status(200).json({
          success: true,
          message: "OTP sent to your email",
          expiresIn: 300, // 5 minutes in seconds
        });
      } catch (emailError) {
        console.error("❌ Failed to send OTP email:", emailError);

        // Delete the OTP if email fails
        await Verification.deleteOne({ _id: verification._id });

        return res.status(500).json({
          error: true,
          message: "Failed to send OTP. Please try again.",
          details:
            process.env.NODE_ENV === "development"
              ? emailError.message
              : undefined,
        });
      }
    } catch (error) {
      console.error("❌ OTP request error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to process OTP request",
      });
    }
  }

  /**
   * Verify OTP and login user
   */
  // In verificationController.js - Update verifyLoginOtp with debug logs
  async verifyLoginOtp(req, res) {
    try {
      const { email, code } = req.body;

      console.log("🔍 Verify OTP request:", { email, code });
      console.log("🔍 Code type:", typeof code, "Length:", code?.length);

      if (!email || !code) {
        console.log("❌ Missing email or code");
        return res.status(400).json({
          error: true,
          message: "Email and OTP are required",
        });
      }

      // Find verification record
      const verification = await Verification.findOne({
        email,
        type: "login-otp",
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      console.log(
        "🔍 Found verification:",
        verification
          ? {
              id: verification._id,
              storedCode: verification.code,
              attempts: verification.attempts,
              expiresAt: verification.expiresAt,
            }
          : "❌ None found",
      );

      if (!verification) {
        return res.status(401).json({
          error: true,
          message: "Invalid or expired OTP",
        });
      }

      // Check attempts
      if (verification.attempts >= 3) {
        console.log("❌ Too many attempts, deleting OTP");
        await Verification.deleteOne({ _id: verification._id });
        return res.status(429).json({
          error: true,
          message: "Too many failed attempts. Please request a new OTP.",
        });
      }

      // Compare codes (trim and compare as strings)
      const inputCode = String(code).trim();
      const storedCode = String(verification.code).trim();

      console.log("🔍 Comparing:", {
        inputCode,
        storedCode,
        match: inputCode === storedCode,
      });

      if (inputCode !== storedCode) {
        verification.attempts += 1;
        await verification.save();

        const attemptsLeft = 3 - verification.attempts;
        console.log(`❌ Code mismatch. Attempts left: ${attemptsLeft}`);

        return res.status(401).json({
          error: true,
          message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left.`,
        });
      }

      // Mark as verified
      verification.verified = true;
      await verification.save();
      console.log("✅ OTP verified successfully");

      // Find or create user
      let user = await User.findOne({ email });

      if (!user) {
        console.log("🆕 Creating new user for:", email);
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
      }

      console.log("👤 User found/created:", user.email, "Role:", user.role);

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
      console.error("❌ Verify OTP error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to verify OTP",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Resend OTP for login
   */
  async resendLoginOtp(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: true,
          message: "Email is required",
        });
      }

      // Delete old OTP
      await Verification.findOneAndDelete({ email, type: "login-otp" });

      // Send new OTP
      return this.sendLoginOtp(req, res);
    } catch (error) {
      console.error("Resend OTP error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to resend OTP",
      });
    }
  }
}

module.exports = new VerificationController();
