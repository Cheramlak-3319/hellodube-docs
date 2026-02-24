// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken, checkRole } = require("../middleware/auth");

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
      console.error("Error fetching pending users:", error);
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
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }

      user.status = "active";
      user.role = role;
      user.approvedBy = req.user.userId;
      user.approvedAt = new Date();
      await user.save();

      console.log(`User ${user.email} approved by ${req.user.email}`);

      res.json({
        success: true,
        message: "User approved successfully",
        user: user.profile,
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({
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
        return res.status(404).json({
          error: true,
          message: "User not found",
        });
      }

      user.status = "rejected";
      user.rejectionReason = reason || "No reason provided";
      await user.save();

      console.log(`User ${user.email} rejected by ${req.user.email}`);

      res.json({
        success: true,
        message: "User rejected",
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({
        error: true,
        message: error.message || "Failed to reject user",
      });
    }
  },
);

module.exports = router;
