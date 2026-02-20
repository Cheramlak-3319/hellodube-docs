const express = require("express");
const router = express.Router();
const { checkRole } = require("../middleware/auth");

// ---------- Helper for consistent error responses ----------
const sendError = (res, status, message) => {
  return res.status(status).json({
    error: true,
    message,
    timestamp: new Date().toISOString(),
  });
};

// ========== WFP ENDPOINTS ==========

/**
 * GET /wfp/getbeneficiarylist.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getbeneficiarylist.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockBeneficiaries = [
        {
          mainWallet: "1198916900",
          beneficiaryName: "Solomon waleligh",
          mobile: "251961201230",
          mainWalletBalance: "600.00",
          subWallets: [
            {
              walletName: "Oil",
              walletBalance: "100.00",
              cycle: "Test Cycle-2",
            },
            {
              walletName: "Eggs",
              walletBalance: "100.00",
              cycle: "Test Cycle-2",
            },
            {
              walletName: "Vegetables",
              walletBalance: "100.00",
              cycle: "Test Cycle-2",
            },
            {
              walletName: "Cereal",
              walletBalance: "100.00",
              cycle: "Test Cycle-2",
            },
            {
              walletName: "Pulses",
              walletBalance: "100.00",
              cycle: "Test Cycle-2",
            },
            {
              walletName: "Salt",
              walletBalance: "100.00",
              cycle: "Test Cycle-2",
            },
          ],
        },
      ];
      res.json({
        error: false,
        totalCount: "10320",
        message: mockBeneficiaries,
      });
    } catch (err) {
      console.error("Error in getbeneficiarylist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/getallinvoices.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getallinvoices.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockInvoices = [
        {
          transactionId: "WFPWP8923034201839",
          merchantUserId: "123456",
          merchantName: "Gesese Molla",
          merchantMobile: "251938905964",
          householdId: "ETNUT000000",
          customerName: "Mulushewa Moges",
          customerMobile: "251913663497",
          amount: 933.68,
          transactionDate: "2025-02-13 08:11:26",
          transactionStatus: "FAILED",
          remark: [
            {
              categoryName: "Oil",
              order: [{ itemName: "Oil", unitPrice: "100.00", quantity: "2" }],
            },
          ],
        },
      ];
      res.json({
        error: false,
        totalCount: "270792",
        message: mockInvoices,
      });
    } catch (err) {
      console.error("Error in wfp getallinvoices:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/gettotalinvoices.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/gettotalinvoices.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          totalAmount: "200,291,934.04",
          totalNumber: "143700",
        },
      });
    } catch (err) {
      console.error("Error in gettotalinvoices:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/gettotalcredit.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/gettotalcredit.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          totalAmount: "200,291,934.04",
          totalNumber: "143700",
        },
      });
    } catch (err) {
      console.error("Error in gettotalcredit:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/getcashouttotals.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getcashouttotals.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          totalCashoutAmount: "200,291,934.04",
          totalCashoutNumber: "143700",
          totalCashoutFeeAmount: "92010.93919999992",
          totalCashoutFeeNumber: "143700",
        },
      });
    } catch (err) {
      console.error("Error in getcashouttotals:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/getcashouthistory.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getcashouthistory.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockCashouts = [
        {
          wallet: "1234567890",
          userId: "123456",
          name: "hello shop",
          mobile: "251900000000",
          bank: "Bank of Abyssinia",
          accountNumber: "1234567890",
          amount: "1000.00",
          status: "PROCESSED",
          requestDate: "2024-01-01",
          transactionData: {
            error: false,
            message: "Successfully processed",
          },
        },
      ];
      res.json({
        error: false,
        totalCount: "7",
        message: mockCashouts,
      });
    } catch (err) {
      console.error("Error in getcashouthistory:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/getcredittransferhistory.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getcredittransferhistory.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockHistory = [
        {
          transactionId: "TRX001",
          householdId: "ETNUT000000",
          wallet: "1234567890",
          customerName: "John Doe",
          customerMobile: "251900000000",
          amount: "1000.00",
          transactionDate: "2024-01-01",
          transactionData: "Additional data",
          transactionStatus: "PROCESSED",
          cycle: "Cycle-1",
        },
      ];
      res.json({
        error: false,
        totalCount: "7",
        message: mockHistory,
      });
    } catch (err) {
      console.error("Error in getcredittransferhistory:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/getonboardingagentlist.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getonboardingagentlist.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockAgents = [
        {
          name: "hello shop",
          mobile: "251900000000",
          active: "1",
          registeredOn: "2024-01-01",
        },
      ];
      res.json({
        error: false,
        totalCount: "7",
        message: mockAgents,
      });
    } catch (err) {
      console.error("Error in getonboardingagentlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/gettotals.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/gettotals.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          totalCashoutAmount: "2082",
          totalCashoutNumber: 77056,
          totalCreditAmount: "2796",
          totalCreditNumber: "77059",
          totalInvoiceAmount: "635",
          totalInvoiceNumber: "36307",
          totalBenefitedMerchantAmount: "537",
          totalBenefitedMerchantNumber: "137",
          totalBenefitedBeneficiaryAmount: 69255702.57,
          totalBenefitedBeneficiaryNumber: "234669",
          totalPurchases: {
            Vegetables: "1000",
            Eggs: "1000",
            Oil: "1000",
            Fruits: "1000",
            Cereal: "1000",
            Pulses: "1000",
            Salt: "1000",
          },
        },
      });
    } catch (err) {
      console.error("Error in wfp gettotals:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/gethealthofficerlist.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/gethealthofficerlist.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, page = 1 } = req.query;
      const mockOfficers = [
        {
          name: "hello shop",
          mobile: "251900000000",
          active: "1",
          registeredOn: "2024-01-01",
        },
      ];
      res.json({
        error: false,
        totalCount: "7",
        message: mockOfficers.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in gethealthofficerlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /wfp/registerhealthofficer.php
 * Role: wfp-admin only
 */
router.post(
  "/registerhealthofficer.php",
  checkRole(["wfp-admin"]),
  (req, res) => {
    try {
      const { hoName, hoMobile } = req.body;
      if (!hoName || !hoMobile) {
        return sendError(res, 400, "Missing hoName or hoMobile.");
      }
      res.status(201).json({
        success: true,
        message: "Health Officer registered successfully.",
      });
    } catch (err) {
      console.error("Error in registerhealthofficer:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /wfp/changebeneficiarystatus.php
 * Role: wfp-admin, wfp-viewer
 */
router.post(
  "/changebeneficiarystatus.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const { householdId, status } = req.body;
      if (!householdId || !status) {
        return sendError(res, 400, "Missing householdId or status.");
      }
      res.json({
        error: false,
        message: "Beneficiary status updated successfully.",
      });
    } catch (err) {
      console.error("Error in changebeneficiarystatus:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /wfp/registeronboardingagents.php
 * Role: wfp-admin only
 */
router.post(
  "/registeronboardingagents.php",
  checkRole(["wfp-admin"]),
  (req, res) => {
    try {
      const { agentName, agentMobile } = req.body;
      if (!agentName || !agentMobile) {
        return sendError(res, 400, "Missing agentName or agentMobile.");
      }
      res.status(201).json({
        error: false,
        message: "Onboarding Agent registered successfully.",
      });
    } catch (err) {
      console.error("Error in registeronboardingagents:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /wfp/updateonboardingagent.php
 * Role: wfp-admin only
 */
router.post(
  "/updateonboardingagent.php",
  checkRole(["wfp-admin"]),
  (req, res) => {
    try {
      const { mobile, active } = req.body;
      if (!mobile || !active) {
        return sendError(res, 400, "Missing mobile or active.");
      }
      res.json({
        error: false,
        message: "Onboarding Agent updated successfully.",
      });
    } catch (err) {
      console.error("Error in updateonboardingagent:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /wfp/updatefoodcategorylist.php
 * Role: wfp-admin only
 */
router.post(
  "/updatefoodcategorylist.php",
  checkRole(["wfp-admin"]),
  (req, res) => {
    try {
      const { mobile, categoryList } = req.body;
      if (!mobile || !categoryList || !Array.isArray(categoryList)) {
        return sendError(
          res,
          400,
          "Missing mobile or categoryList (must be array).",
        );
      }
      res.json({
        error: false,
        message: "Food category list updated successfully.",
      });
    } catch (err) {
      console.error("Error in updatefoodcategorylist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /wfp/transfercredit.php
 * Role: wfp-admin only
 */
router.post("/transfercredit.php", checkRole(["wfp-admin"]), (req, res) => {
  try {
    const { householdId, cycle } = req.body;
    if (!householdId || !cycle) {
      return sendError(res, 400, "Missing householdId or cycle.");
    }
    res.json({
      error: false,
      message: "Credit transferred successfully.",
    });
  } catch (err) {
    console.error("Error in transfercredit:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

/**
 * POST /wfp/validatedisbursement.php
 * Role: wfp-admin only
 */
router.post(
  "/validatedisbursement.php",
  checkRole(["wfp-admin"]),
  (req, res) => {
    try {
      const { householdId, cycle } = req.body;
      if (!householdId || !cycle) {
        return sendError(res, 400, "Missing householdId or cycle.");
      }
      res.json({
        error: false,
        message: "Disbursement validated successfully.",
      });
    } catch (err) {
      console.error("Error in validatedisbursement:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/generatedummyvouchers.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/generatedummyvouchers.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockVouchers = [
        {
          userId: "123456",
          balance: 895,
          createdOn: "2025-02-14 06:14:56",
          creditWallet: "9289473512",
        },
      ];
      res.json({
        error: false,
        message: mockVouchers,
      });
    } catch (err) {
      console.error("Error in generatedummyvouchers:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /wfp/getvoucherslist.php
 * Role: wfp-admin, wfp-viewer
 */
router.get(
  "/getvoucherslist.php",
  checkRole(["wfp-admin", "wfp-viewer"]),
  (req, res) => {
    try {
      const mockVouchersList = [
        {
          householdId: "ETNUT000000",
          name: "Solomon waleligh",
          mobile: "251961201230",
          wallet: "600.00",
          woreda: "Example Woreda",
          kebele: "Example Kebele",
          balance: "600.00",
          updatedOn: "2025-02-14 06:23:47",
          createdOn: "2025-02-14 06:23:47",
          linked: false,
          active: "1",
          cycle: "Test Cycle-2",
        },
      ];
      res.json({
        error: false,
        totalCount: "10320",
        message: mockVouchersList,
      });
    } catch (err) {
      console.error("Error in getvoucherslist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

module.exports = router;
