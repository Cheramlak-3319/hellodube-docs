const express = require("express");
const router = express.Router();
const { checkRole } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid"); // Install: npm install uuid

// ========== Helper Functions ==========
const sendError = (res, status, message) => {
  return res.status(status).json({
    error: true,
    message,
    timestamp: new Date().toISOString(),
  });
};

// In-memory storage (replace with database in production)
let cycles = [
  {
    id: "RUdxSUC9-PhW5-3MDW-5uuI-mOTiaYyjAQN0",
    cycle: "Cycle-13 SSC",
    active: "1",
    startDate: "2025-02-14",
    endDate: "2025-02-14",
    categoryName: "Oil",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "Ywh8Epr6-CDd3-PgQs-BcRr-vtRYzr8GlTP4",
    cycle: "Cycle-12 SSC",
    active: "1",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    categoryName: "Cereal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ========== GET ALL CYCLES ==========
/**
 * GET /wfp/getallcycles.php
 * Description: Retrieve all program cycles
 * Access: wfp-admin, wfp-viewer
 */
router.get(
  "/getallcycles.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      // Optional filtering
      const { active, category } = req.query;

      let filteredCycles = [...cycles];

      if (active !== undefined) {
        filteredCycles = filteredCycles.filter((c) => c.active === active);
      }

      if (category) {
        filteredCycles = filteredCycles.filter((c) =>
          c.categoryName?.toLowerCase().includes(category.toLowerCase()),
        );
      }

      res.json({
        error: false,
        totalCount: filteredCycles.length.toString(),
        message: filteredCycles.map(
          ({ id, cycle, active, startDate, endDate }) => ({
            id,
            cycle,
            active,
            startDate,
            endDate,
          }),
        ),
      });
    } catch (err) {
      console.error("Error in getallcycles:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

// ========== GET CYCLE BY ID ==========
/**
 * GET /wfp/getcycle.php?id={cycleId}
 * Description: Get a specific cycle by ID
 * Access: wfp-admin, wfp-viewer
 */
router.get(
  "/getcycle.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const { id } = req.query;

      if (!id) {
        return sendError(res, 400, "Cycle ID is required");
      }

      const cycle = cycles.find((c) => c.id === id);

      if (!cycle) {
        return sendError(res, 404, "Cycle not found");
      }

      res.json({
        error: false,
        message: cycle,
      });
    } catch (err) {
      console.error("Error in getcycle:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

// ========== REGISTER NEW CYCLE ==========
/**
 * POST /wfp/registerCycle
 * Description: Register a new program cycle
 * Access: wfp-admin only
 */
router.post("/registerCycle", checkRole(["wfp-admin"]), (req, res) => {
  try {
    const { categoryName, startDate, endDate } = req.body;

    // Validation
    if (!categoryName || !startDate || !endDate) {
      return sendError(
        res,
        400,
        "categoryName, startDate, and endDate are required",
      );
    }

    // Generate cycle name based on category and date
    const year = new Date(startDate).getFullYear();
    const cycleNumber =
      cycles.filter(
        (c) => c.categoryName === categoryName && c.startDate.includes(year),
      ).length + 1;

    const newCycle = {
      id: uuidv4(),
      cycle: `${categoryName} Cycle-${cycleNumber} ${year}`,
      active: "1",
      startDate,
      endDate,
      categoryName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cycles.push(newCycle);

    res.status(201).json({
      error: false,
      message: "Cycle registered successfully",
      data: {
        id: newCycle.id,
        cycle: newCycle.cycle,
        startDate: newCycle.startDate,
        endDate: newCycle.endDate,
      },
    });
  } catch (err) {
    console.error("Error in registerCycle:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

// ========== UPDATE CYCLE ==========
/**
 * POST /wfp/updatecycle.php
 * Description: Update an existing program cycle
 * Access: wfp-admin only
 */
router.post("/updatecycle.php", checkRole(["wfp-admin"]), (req, res) => {
  try {
    const { id, endDate, startDate, active } = req.body;

    if (!id) {
      return sendError(res, 400, "Cycle ID is required");
    }

    const cycleIndex = cycles.findIndex((c) => c.id === id);

    if (cycleIndex === -1) {
      return sendError(res, 404, "Cycle not found");
    }

    // Update fields
    if (endDate) cycles[cycleIndex].endDate = endDate;
    if (startDate) cycles[cycleIndex].startDate = startDate;
    if (active !== undefined) cycles[cycleIndex].active = active;

    cycles[cycleIndex].updatedAt = new Date().toISOString();

    res.json({
      error: false,
      message: "Cycle updated successfully",
      data: {
        id: cycles[cycleIndex].id,
        cycle: cycles[cycleIndex].cycle,
        active: cycles[cycleIndex].active,
        startDate: cycles[cycleIndex].startDate,
        endDate: cycles[cycleIndex].endDate,
      },
    });
  } catch (err) {
    console.error("Error in updatecycle:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

// ========== CANCEL/DELETE CYCLE ==========
/**
 * POST /wfp/cancelcycle.php
 * Description: Cancel/delete an existing program cycle
 * Access: wfp-admin only
 */
router.post("/cancelcycle.php", checkRole(["wfp-admin"]), (req, res) => {
  try {
    const { cycleId } = req.body;

    if (!cycleId) {
      return sendError(res, 400, "Cycle ID is required");
    }

    const cycleIndex = cycles.findIndex((c) => c.id === cycleId);

    if (cycleIndex === -1) {
      return sendError(res, 404, "Cycle not found");
    }

    // Soft delete - mark as inactive
    cycles[cycleIndex].active = "0";
    cycles[cycleIndex].updatedAt = new Date().toISOString();

    // For hard delete, use: cycles.splice(cycleIndex, 1);

    res.json({
      error: false,
      message: "Cycle cancelled successfully",
    });
  } catch (err) {
    console.error("Error in cancelcycle:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

// ========== GET ACTIVE CYCLES ==========
/**
 * GET /wfp/getactivecycles.php
 * Description: Get all active cycles
 * Access: wfp-admin, wfp-viewer
 */
router.get(
  "/getactivecycles.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const activeCycles = cycles.filter((c) => c.active === "1");

      res.json({
        error: false,
        totalCount: activeCycles.length.toString(),
        message: activeCycles.map(({ id, cycle, startDate, endDate }) => ({
          id,
          cycle,
          startDate,
          endDate,
        })),
      });
    } catch (err) {
      console.error("Error in getactivecycles:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

// ========== GET CYCLES BY DATE RANGE ==========
/**
 * GET /wfp/getcyclesbydate.php
 * Description: Get cycles within a date range
 * Access: wfp-admin, wfp-viewer
 * Query params: start, end
 */
router.get(
  "/getcyclesbydate.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return sendError(res, 400, "Start and end dates are required");
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      const filteredCycles = cycles.filter((c) => {
        const cycleStart = new Date(c.startDate);
        const cycleEnd = new Date(c.endDate);
        return cycleStart >= startDate && cycleEnd <= endDate;
      });

      res.json({
        error: false,
        totalCount: filteredCycles.length.toString(),
        message: filteredCycles,
      });
    } catch (err) {
      console.error("Error in getcyclesbydate:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

// ========== BULK CYCLE OPERATIONS ==========
/**
 * POST /wfp/bulkcycleupdate.php
 * Description: Update multiple cycles at once
 * Access: wfp-admin only
 */
router.post("/bulkcycleupdate.php", checkRole(["wfp-admin"]), (req, res) => {
  try {
    const { cycleIds, operation, value } = req.body;

    if (!cycleIds || !Array.isArray(cycleIds) || cycleIds.length === 0) {
      return sendError(res, 400, "cycleIds array is required");
    }

    if (!operation || !value) {
      return sendError(res, 400, "operation and value are required");
    }

    const updated = [];
    const failed = [];

    cycleIds.forEach((id) => {
      const cycleIndex = cycles.findIndex((c) => c.id === id);
      if (cycleIndex !== -1) {
        switch (operation) {
          case "activate":
            cycles[cycleIndex].active = "1";
            break;
          case "deactivate":
            cycles[cycleIndex].active = "0";
            break;
          case "extend":
            // Extend end date by value days
            const newEnd = new Date(cycles[cycleIndex].endDate);
            newEnd.setDate(newEnd.getDate() + parseInt(value));
            cycles[cycleIndex].endDate = newEnd.toISOString().split("T")[0];
            break;
          default:
            failed.push({ id, reason: "Invalid operation" });
            return;
        }
        cycles[cycleIndex].updatedAt = new Date().toISOString();
        updated.push(id);
      } else {
        failed.push({ id, reason: "Cycle not found" });
      }
    });

    res.json({
      error: false,
      message: "Bulk update completed",
      updated: updated.length,
      failed,
    });
  } catch (err) {
    console.error("Error in bulkcycleupdate:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

module.exports = router;
