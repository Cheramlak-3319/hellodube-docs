// controllers/verificationController.js
const Verification = require("../models/Verification");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Email configuration with better error handling
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
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

  // Verify code
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

      //   // Check attempts
      //   if (verification.attempts >= 3) {
      //     return res.status(429).json({
      //       error: true,
      //       message: "Too many failed attempts. Please request a new code.",
      //     });
      //   }

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

  // Resend code
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
}

module.exports = new VerificationController();
