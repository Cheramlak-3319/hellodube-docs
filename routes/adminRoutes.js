// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken, checkRole } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");
const { logger } = require("../middleware/requestLogger");
const nodemailer = require("nodemailer");

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get pending users
router.get(
  "/pending-users",
  verifyToken,
  checkRole(["dube-admin", "wfp-admin"]),
  async (req, res) => {
    try {
      const pendingUsers = await User.find({
        status: "pending",
      })
        .select("-password")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: pendingUsers.length,
        users: pendingUsers,
      });
    } catch (error) {
      logger.error("Error fetching pending users:", error);
      res.status(500).json({
        error: true,
        message: "Failed to fetch pending users",
      });
    }
  },
);

// Approve user
router.post(
  "/approve-user/:userId",
  verifyToken,
  checkRole(["dube-admin", "wfp-admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      user.status = "active";
      user.role = role;
      user.approvedBy = req.user.userId;
      user.approvedAt = new Date();
      await user.save();

      // Send approval email
      try {
        await transporter.sendMail({
          from: `"HellOOpass" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Your Account Has Been Approved",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #00a884;">Welcome to HellOOpass!</h2>
              <p>Dear ${user.firstName},</p>
              <p>Your account has been approved by an administrator.</p>
              <p>You can now log in with your email and password.</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center;">
                <a href="${process.env.BASE_URL}/login.html" 
                   style="background: #00a884; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 30px; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
              <p>Your role: <strong>${role}</strong></p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        logger.error("Failed to send approval email:", emailError);
      }

      logger.info(`User ${user.email} approved by ${req.user.email}`);

      res.json({
        success: true,
        message: "User approved successfully",
        user: user.profile,
      });
    } catch (error) {
      logger.error("Error approving user:", error);
      res.status(error.statusCode || 500).json({
        error: true,
        message: error.message || "Failed to approve user",
      });
    }
  },
);

// Reject user
router.post(
  "/reject-user/:userId",
  verifyToken,
  checkRole(["dube-admin", "wfp-admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      user.status = "rejected";
      user.rejectionReason = reason || "No reason provided";
      await user.save();

      // Send rejection email (optional)
      try {
        await transporter.sendMail({
          from: `"HellOOpass" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Account Registration Update",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Registration Update</h2>
              <p>Dear ${user.firstName},</p>
              <p>Your account registration has been reviewed and was not approved at this time.</p>
              ${reason ? `<p>Reason: ${reason}</p>` : ""}
              <p>If you have questions, please contact support.</p>
            </div>
          `,
        });
      } catch (emailError) {
        logger.error("Failed to send rejection email:", emailError);
      }

      logger.info(`User ${user.email} rejected by ${req.user.email}`);

      res.json({
        success: true,
        message: "User rejected",
      });
    } catch (error) {
      logger.error("Error rejecting user:", error);
      res.status(error.statusCode || 500).json({
        error: true,
        message: error.message || "Failed to reject user",
      });
    }
  },
);

// Get user stats
router.get(
  "/stats",
  verifyToken,
  checkRole(["dube-admin", "wfp-admin"]),
  async (req, res) => {
    try {
      const [pendingCount, totalCount, weeklyCount, todayApprovals] =
        await Promise.all([
          User.countDocuments({ status: "pending" }),
          User.countDocuments(),
          User.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          }),
          User.countDocuments({
            status: "active",
            approvedAt: { $gte: new Date().setHours(0, 0, 0, 0) },
          }),
        ]);

      res.json({
        success: true,
        stats: {
          pending: pendingCount,
          total: totalCount,
          weekly: weeklyCount,
          todayApprovals,
        },
      });
    } catch (error) {
      logger.error("Error fetching stats:", error);
      res.status(500).json({
        error: true,
        message: "Failed to fetch stats",
      });
    }
  },
);

module.exports = router;
