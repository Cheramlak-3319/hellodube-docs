// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken, checkRole } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");
const { logger } = require("../middleware/requestLogger");

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

module.exports = router;
