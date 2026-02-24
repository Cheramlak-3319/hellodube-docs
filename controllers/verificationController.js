// controllers/verificationController.js
const Verification = require("../models/Verification");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");
const nodemailer = require("nodemailer");
const { logger } = require("../middleware/requestLogger");

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class VerificationController {
  constructor() {
    this.sendEmailCode = this.sendEmailCode.bind(this);
    this.verifyEmailCode = this.verifyEmailCode.bind(this);
    this.resendEmailCode = this.resendEmailCode.bind(this);
  }

  // Generate 6-digit code
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code
  async sendEmailCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email is required", 400);
      }

      // Check if email already exists and is verified
      const existingUser = await User.findOne({ email, emailVerified: true });
      if (existingUser) {
        throw new AppError("Email already registered and verified", 409);
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

        logger.info(`✅ Verification email sent to ${email}`);

        res.status(200).json({
          success: true,
          message: "Verification code sent to your email",
          expiresIn: 600, // 10 minutes in seconds
        });
      } catch (emailError) {
        logger.error("❌ Failed to send email:", emailError);
        throw new AppError(
          "Failed to send verification email. Please try again.",
          500,
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: true,
          message: error.message,
        });
      }

      logger.error("Send code error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to send verification code",
      });
    }
  }

  // Verify code
  async verifyEmailCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new AppError("Email and verification code are required", 400);
      }

      // Find verification record
      const verification = await Verification.findOne({
        email,
        type: "email",
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (!verification) {
        throw new AppError("Invalid or expired verification code", 400);
      }

      // Check attempts
      if (verification.attempts >= 3) {
        throw new AppError(
          "Too many failed attempts. Please request a new code.",
          429,
        );
      }

      // Verify code
      if (verification.code !== code) {
        verification.attempts += 1;
        await verification.save();

        const attemptsLeft = 3 - verification.attempts;
        throw new AppError(
          `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left.`,
          400,
        );
      }

      // Mark as verified
      verification.verified = true;
      await verification.save();

      logger.info(`✅ Email verified successfully: ${email}`);

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        verified: true,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: true,
          message: error.message,
        });
      }

      logger.error("Verify code error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to verify code",
      });
    }
  }

  // Resend code
  async resendEmailCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email is required", 400);
      }

      // Delete old verification
      await Verification.findOneAndDelete({ email, type: "email" });

      // Send new code
      return this.sendEmailCode(req, res);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: true,
          message: error.message,
        });
      }

      logger.error("Resend code error:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to resend code",
      });
    }
  }
}

module.exports = new VerificationController();
