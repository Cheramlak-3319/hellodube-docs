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

// ========== DUBE INTERNATIONAL ENDPOINTS ==========

/**
 * GET /dube/international/getprojectlist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getprojectlist.php",
  checkRole(["dube-admin"]),
  (req, res) => {
    try {
      const { limit = 10, Page = 1, countryCode } = req.query;
      // Mock data – in real app, query database
      const mockProjects = [
        {
          projectName: "Standard_ET",
          countryCode: "ET",
          countryName: "Ethiopia",
          creditDisbursementWallet: "1234567890",
          earningWallet: "0987654321",
          settlementBank: "",
          settlementAccount: "",
        },
        {
          projectName: "Standard_KE",
          countryCode: "KE",
          countryName: "Kenya",
          creditDisbursementWallet: "2234567890",
          earningWallet: "1987654321",
          settlementBank: "KCB",
          settlementAccount: "12345678",
        },
      ];

      const filtered = countryCode
        ? mockProjects.filter((p) => p.countryCode === countryCode)
        : mockProjects;

      res.json({
        error: false,
        totalCount: filtered.length.toString(),
        message: filtered.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in getprojectlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/getsupplierlist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getsupplierlist.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, offset = 0, mobile, countryCode } = req.query;
      const mockSuppliers = [
        {
          name: "hello shop",
          wallet: "2244972362",
          walletBalance: "0.00",
          pendingWalletBalance: "0.00",
          mobile: "251991152362",
          userId: "123456",
          status: "1",
        },
        {
          name: "Yegha Plc",
          wallet: "2244972363",
          walletBalance: "1500.50",
          pendingWalletBalance: "200.00",
          mobile: "251912345678",
          userId: "123457",
          status: "1",
        },
      ];
      res.json({
        error: false,
        totalCount: mockSuppliers.length.toString(),
        message: mockSuppliers.slice(
          Number(offset),
          Number(offset) + Number(limit),
        ),
      });
    } catch (err) {
      console.error("Error in getsupplierlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/getreceiptlist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getreceiptlist.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, page = 1, countryCode } = req.query;
      const mockReceipts = [
        {
          id: "7Gq5Xaje-XGMQ-CjaX-ZoDI-cmQnUR4My4bs",
          idList: "rL4Li0MV-RRl0-plEV-q7kB-NOXzKLcgz39j",
          receiptFilename:
            "https://helloomarket.com/api/dube/international/receipts/7_1738584765-1000028726.jpg",
          uploadedOn: "2025-02-03 12:12:45",
          order: [
            {
              earningWallet: "7354340745",
              productId: "003610003",
              price: "2.00",
              quantity: "2",
              supplier_name: "Yegha Plc",
              supplier_id: "si0993442",
              order_date: "2024-12-30",
              hellooMarketOrderId: "20232",
            },
          ],
          status: "RECEIVED",
        },
      ];
      res.json({
        error: false,
        totalCount: mockReceipts.length.toString(),
        message: mockReceipts.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in getreceiptlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/gettotals.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/gettotals.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          numberOfActiveMerchants: "2082",
          numberOfActiveCustomers: 77056,
          totalNumberOfMerchants: "2796",
          totalNumberOfSuppliers: "1559",
          totalNumberOfCustomers: "77059",
          totalNumberOfMerchantsWithActivePINs: "635",
          totalNumberOfCustomersWithActivePINs: "36307",
          totalNumberOfLoggedInMerchants: "537",
          totalNumberOfLoggedInCustomers: "137",
          totalInvoiceAmount: 69255702.57,
          totalNumberOfInvoices: "234669",
          totalCashInAmount: "255763017067.2603",
          totalNumberOfCashIns: "363",
          totalCashoutAmount: "36307",
          totalNumberOfCashouts: "7590",
          totalCreditAmount: "4661786",
          totalNumberOfCredit: "914",
          totalRepayedAmount: "296556.1291",
          totalNumberOfRepayment: "895",
          totalUnpaidInvoicesAmount: "174157.80000000005",
          totalNumberOfUnpaidInvoices: "247",
          totalOverdueInvoicesAmount: "172935.15000000002",
          totalNumberOfOverdueInvoices: "241",
          totalTransfersCount: "732",
          totalNumberOfTransfers: "4165736.7399999998",
        },
      });
    } catch (err) {
      console.error("Error in gettotals:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/gettotals.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/gettotals.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          numberOfActiveMerchants: "2082",
          numberOfActiveCustomers: 77056,
          totalNumberOfMerchants: "2796",
          totalNumberOfCustomers: "77059",
          totalNumberOfMerchantsWithActivePINs: "635",
          totalNumberOfCustomersWithActivePINs: "36307",
          totalNumberOfLoggedInMerchants: "537",
          totalNumberOfLoggedInCustomers: "137",
          totalInvoiceAmount: 69255702.57,
          totalNumberOfInvoices: "234669",
        },
      });
    } catch (err) {
      console.error("Error in gettotals (basic):", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/gettotalsleapfrog.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/gettotalsleapfrog.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          numberOfActiveSalesAgents: "82",
          numberOfActiveRetailers: 77056,
          totalInvoiceAmount: "2796",
          totalNumberOfInvoices: "77059",
          totalCreditAmountSalesAgents: "635",
          totalNumberOfCreditSalesAgents: "36307",
          totalCreditAmountRetailers: "537",
          totalNumberOfCreditRetailers: "137",
          totalRepayedAmount: 69255702.57,
          totalNumberOfRepayment: "234669",
          totalUnpaidInvoicesAmount: "234669",
          totalNumberOfUnpaidInvoices: 234669,
          totalOverdueInvoicesAmount: 234669,
          totalNumberOfOverdueInvoices: 234669,
        },
      });
    } catch (err) {
      console.error("Error in gettotalsleapfrog:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/getrepaymenthistorylist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/getrepaymenthistorylist.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, Page = 1, mobile, countryCode } = req.query;
      const mockHistory = [
        {
          transactionList: "DW74818394Laa0003",
          transactionID: "DWCRmVj4F6NR50003",
          paidFrom: "9733770001",
          payerName: "Eliana Tewodros",
          payerMobile: "233900000003",
          repaidAmount: "0.00",
          repaymentStatus: "PROCESSED",
          repaymentDate: "2024-11-15 14:46:27",
          wallets: [
            {
              name: "1190073738",
              wallettype: "MERCHANT_CREDIT",
              balance: "2000000",
              bnpl: "2000000",
            },
            {
              name: "1451013738",
              wallettype: "MERCHANT_AVAILABLE",
              balance: "1500000",
              bnpl: "1500000",
            },
            {
              name: "4197613738",
              wallettype: "MERCHANT_EARNING",
              balance: "1500000",
              bnpl: "1500000",
            },
          ],
          foodCategory: "desert",
        },
      ];
      res.json({
        error: false,
        totalCount: mockHistory.length.toString(),
        message: mockHistory.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in getrepaymenthistorylist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/international/registerproject.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/international/registerproject.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const {
        projectName,
        countryCode,
        mobile,
        settlementAccount,
        settlementBank,
      } = req.body;
      if (
        !projectName ||
        !countryCode ||
        !mobile ||
        !settlementAccount ||
        !settlementBank
      ) {
        return sendError(res, 400, "Missing required fields.");
      }
      // In real app: save to database
      res.status(201).json({
        success: true,
        message: "Project created successfully.",
      });
    } catch (err) {
      console.error("Error in registerproject:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/international/registersupplier.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/international/registersupplier.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { fullname, project, mobile, dialCode } = req.body;
      if (!fullname || !project || !mobile || !dialCode) {
        return sendError(res, 400, "Missing required fields.");
      }
      res.status(201).json({
        success: true,
        message: "Supplier created successfully.",
      });
    } catch (err) {
      console.error("Error in registersupplier:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/international/registersupplierproduct.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/international/registersupplierproduct.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const required = [
        "supplierName",
        "supplierId",
        "supplierPhone",
        "productReference",
        "productName",
        "price",
        "requireReceipt",
        "wallet",
        "encodedFile",
        "filename",
      ];
      const missing = required.filter((field) => !req.body[field]);
      if (missing.length) {
        return sendError(res, 400, `Missing fields: ${missing.join(", ")}`);
      }
      res.status(201).json({
        success: true,
        message: "Supplier product created successfully.",
      });
    } catch (err) {
      console.error("Error in registersupplierproduct:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/international/updatereceiptstatus.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/international/updatereceiptstatus.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { id, status } = req.body;
      if (!id || !status) {
        return sendError(res, 400, "Missing id or status.");
      }
      res.json({
        error: false,
        message: "Receipt status updated successfully.",
      });
    } catch (err) {
      console.error("Error in updatereceiptstatus:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/getrepaymenthistorylist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getrepaymenthistorylist.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, Page = 1 } = req.query;
      const mock = [
        {
          transactionList: "DW12345678AbC1234",
          transactionID: "DWCRAbCdRA00000",
          paidFrom: "9733770001",
          payerName: "Hello Shop",
          payerMobile: "251900000000",
          payerUserId: "123456",
          repaidAmount: "0.00",
          repaymentStatus: "PROCESSED",
          repaymentDate: "2024-11-15 14:46:27",
          invoice: [
            {
              transactionId: "DWCRAbCdRA00000",
              wallettype: "MERCHANT_CREDIT",
              amount: 10,
              transactionDate: "2024-11-15 14:46:27",
            },
          ],
        },
      ];
      res.json({
        error: false,
        totalCount: mock.length.toString(),
        message: mock.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in international/getrepaymenthistorylist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/getcustomerlist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getcustomerlist.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const mockCustomers = [
        {
          userid: "123456",
          fullname: "hello shop",
          mobile: "25112345678",
          creditwallet: "1234567890",
          purchasewallet: "1234567890",
          purchasebalance: "0.00",
          createdon: "2024-11-12 07:08:55",
          createdby: "233900000002",
          merchantName: "hello shop",
          merchantUserId: "123456",
          active: "1",
          bnpl: "0.00",
          otheCreditLines: [],
          gifts: [],
        },
      ];
      res.json({
        error: false,
        totalCount: mockCustomers.length.toString(),
        message: mockCustomers.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in getcustomerlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/getallcustomers.php
 * Role: dube-admin only
 */
router.get("/getallcustomers.php", checkRole(["dube-admin"]), (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const mockAllCustomers = [
      {
        userid: "123456",
        fullname: "hello shop",
        mobile: "255710101010",
        creditwallet: "8376940003",
        creditbalance: "0.00",
        purchasewallet: "1234567890",
        purchasebalance: "0.00",
        createdon: "2024-11-12 07:08:55",
        active: "1",
        gifts: [
          {
            giftWallet: "4669016915",
            giftedBy: "003610003",
            giftBalance: "2.00",
            lable: "Hello Shop Gift",
            theme: "Hello Shop",
            sponsorName: "Yegha Plc",
            sponsorPhone: "255710101010",
          },
        ],
      },
    ];
    res.json({
      error: false,
      totalCount: mockAllCustomers.length.toString(),
      message: mockAllCustomers.slice(0, Number(limit)),
    });
  } catch (err) {
    console.error("Error in getallcustomers:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

/**
 * POST /dube/international/changephonenumber.php
 * Role: dube-admin only
 */
router.post(
  "/international/changephonenumber.php",
  checkRole(["dube-admin"]),
  (req, res) => {
    try {
      const { userId, toMobile, dialCode } = req.body;
      if (!userId || !toMobile || !dialCode) {
        return sendError(res, 400, "Missing required fields.");
      }
      res.json({
        error: false,
        message: "Phone number updated successfully.",
      });
    } catch (err) {
      console.error("Error in changephonenumber:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/changename.php
 * Role: dube-admin only
 */
router.post("/changename.php", checkRole(["dube-admin"]), (req, res) => {
  try {
    const { userId, fullName } = req.body;
    if (!userId || !fullName) {
      return sendError(res, 400, "Missing userId or fullName.");
    }
    res.json({
      error: false,
      message: "Full name updated successfully.",
    });
  } catch (err) {
    console.error("Error in changename:", err);
    sendError(res, 500, "An internal server error occurred.");
  }
});

/**
 * POST /dube/getcustomercredithistory.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/getcustomercredithistory.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { wallet, start, end, limit = 10, offset = 0 } = req.body;
      if (!wallet || !start || !end) {
        return sendError(res, 400, "Missing wallet, start, or end.");
      }
      const mockHistory = [
        {
          transactionId: "DW12345678AbC1234",
          senderName: "HelloDube",
          senderMobile: "251900000000",
          creditAmount: "9733",
          transactionStatus: "PROCESSED",
          transactionDate: "2024-11-15 14:46:27",
        },
      ];
      res.json({
        error: false,
        totalCount: mockHistory.length.toString(),
        message: mockHistory.slice(
          Number(offset),
          Number(offset) + Number(limit),
        ),
      });
    } catch (err) {
      console.error("Error in getcustomercredithistory:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/getcustomerlistofmerchant.php
 * Role: dube-admin only
 */
router.post(
  "/getcustomerlistofmerchant.php",
  checkRole(["dube-admin"]),
  (req, res) => {
    try {
      const { mobile } = req.body;
      if (!mobile) {
        return sendError(res, 400, "Missing mobile.");
      }
      const mockList = [
        {
          userId: "123456",
          walletType: "CUSTOMER_CREDIT",
          fullname: "hello shop",
          mobile: "251900000000",
          wallet: "2299401133",
          balance: "10.00",
          initialDeposit: "10.00",
          createdOn: "2024-11-15 14:46:27",
          bnplBalance: "0.00",
          creditPayment: [],
          creditRepayment: [],
        },
      ];
      res.json({
        error: false,
        message: mockList,
      });
    } catch (err) {
      console.error("Error in getcustomerlistofmerchant:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/international/customerselfregistration.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/international/customerselfregistration.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { fullName, mobile, dialCode } = req.body;
      if (!fullName || !mobile || !dialCode) {
        return sendError(res, 400, "Missing required fields.");
      }
      res.status(201).json({
        error: false,
        message: "User registered successfully.",
      });
    } catch (err) {
      console.error("Error in customerselfregistration:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/getallinvoices.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getallinvoices.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const mockInvoices = [
        {
          transactionId: "WFPWP1234567890123",
          merchantName: "Hello Shop",
          merchantUserId: "123456",
          merchantMobile: "251912345678",
          customerName: "Hello Market",
          customerMobile: "251987654332",
          amount: 933.68,
          transactionDate: "2025-02-13 08:11:26",
          transactionStatus: "PROCESSED",
          dueDate: "2027-02-13 08:10:50",
          overdue: false,
          repayed: "0",
          repayment: [],
        },
      ];
      res.json({
        error: false,
        totalCount: "270792",
        message: mockInvoices.slice(
          Number(offset),
          Number(offset) + Number(limit),
        ),
      });
    } catch (err) {
      console.error("Error in getallinvoices:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/getopeninvoices.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/getopeninvoices.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const mockOpen = [
        {
          transactionID: "DW12345678AbC1234",
          amount: 10,
          customerCreditWallet: "9733770001",
          customerName: "Hello Shop",
          customerMobile: "251900000000",
          transactionDate: "2024-11-15 14:46:27",
          dueDate: "2024-11-15 14:46:27",
          overdue: false,
        },
      ];
      res.json({
        error: false,
        totalCount: "2792",
        message: mockOpen.slice(Number(offset), Number(offset) + Number(limit)),
      });
    } catch (err) {
      console.error("Error in getopeninvoices:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/getinvoicesandrepayments.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/getinvoicesandrepayments.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          totalRepayedAmount: "296556.1291",
          totalRepayedNumber: "895",
          totalToBePaidAmount: "174157.80000000005",
          totalToBePaidNumber: "247",
          totalOverdueAmount: "172935.15000000002",
          totalOverdueNumber: "241",
          totalInvoiceAmount: "732",
          totalInvoiceNumber: "4165736.7399999998",
        },
      });
    } catch (err) {
      console.error("Error in getinvoicesandrepayments:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/international/getmerchantlist.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/international/getmerchantlist.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, Page = 1 } = req.query;
      const mockMerchants = [
        {
          userid: "123456",
          fullname: "hello shop",
          businessName: "hello shop",
          mobile: "251912345678",
          createdon: "2024-11-12 07:08:55",
          project: "Palladium",
          initialdeposit: "0.00",
          bnpl: "0.00",
          active: "1",
          lastTrxnDate: "2024-11-15 14:46:27",
          language: "en",
          wallets: [
            {
              name: "0.00",
              wallettype: "MERCHANT_CREDIT",
              balance: "2000000",
              bnpl: "0.00",
            },
            {
              name: "1451013738",
              wallettype: "MERCHANT_EARNING",
              balance: "0.00",
              bnpl: "0.00",
            },
            {
              name: "4197613738",
              wallettype: "MERCHANT_AVAILABLE",
              balance: "0.00",
              bnpl: "0.00",
            },
          ],
          foodCategory: "desert",
        },
      ];
      res.json({
        error: false,
        totalCount: mockMerchants.length.toString(),
        message: mockMerchants.slice(0, Number(limit)),
      });
    } catch (err) {
      console.error("Error in getmerchantlist:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/gettopuphistory.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/gettopuphistory.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const mockTopUp = [
        {
          name: "nana Market",
          mobile: "251900000000",
          walletType: "MERCHANT_AVAILABLE",
          userId: "123456",
          transactionID: "DWT1020304050600000",
          financialInstitution: "Bank of Abyssinia",
          amount: "10.00",
          invoiceID: "1739874588-2162574953",
          InvoiceReference: "202502181329491891797258803220481",
          tracenumber:
            "https://app.ethiomobilemoney.et:2121/ammwebpay/#/?transactionNo=202502123456789091797258803220481",
          transactionStatus: "PROCESSED",
          transactionDate: "2024-11-15 14:46:27",
          transactionData: {
            from: "+251912345678",
            fromname: "Hello Marketplace",
            fromaccount: "000012334421",
            to: "0109091",
            toname: "AMASIS B",
            toaccount: "3109191",
            amount: 5,
            fee: 0.99,
            currency: "ETB",
            description: "HelloDube Wallet Refill 5190614578",
            statusdetail: "REGULAR_TRANSFER",
            statuscomment: null,
            url: "https://bill.mamapays.com/U2diMlZjN2ItYTZGWS1odzFmLWVPV2otYll0Um90Y1FLZGc4/pay",
            tracenumber: "1739874588-2162574953",
            invoiceid: "5KE23BJDN1F9IMG107J6EOFYWQ7XLEOL",
            id: "LIO000044776089ETH",
            date: "2025-02-11T11:32:56Z",
            processdate: "2025-02-11T11:32:56Z",
            status: "PROCESSED",
            system: "Bank of Abyssinia",
          },
        },
      ];
      res.json({
        error: false,
        message: mockTopUp.slice(
          Number(offset),
          Number(offset) + Number(limit),
        ),
      });
    } catch (err) {
      console.error("Error in gettopuphistory:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * GET /dube/getcashinandouttotals.php
 * Role: dube-admin, dube-viewer
 */
router.get(
  "/getcashinandouttotals.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      res.json({
        error: false,
        message: {
          totalCashInAmount: "255763017067.2603",
          totalNumberOfCashIns: "363",
          totalCashoutAmount: "36307",
          totalNumberOfCashouts: "7590",
          totalCreditAmount: "4661786",
          totalNumberOfCredit: "914",
        },
      });
    } catch (err) {
      console.error("Error in getcashinandouttotals:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/getpaymenthistory.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/getpaymenthistory.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { wallet, start, end, limit = 10, offset = 0 } = req.body;
      if (!wallet || !start || !end) {
        return sendError(res, 400, "Missing wallet, start, or end.");
      }
      const mockPayments = [
        {
          transactionId: "DW12345678AbC1234",
          payerName: "HelloDube",
          payerMobile: "251900000000",
          paidAmount: "200000",
          receivedAmount: "19000",
          transactionStatus: "PROCESSED",
          transactionDate: "2024-11-15 14:46:27",
          remark: "invoice",
        },
      ];
      res.json({
        error: false,
        totalCount: mockPayments.length.toString(),
        message: mockPayments.slice(
          Number(offset),
          Number(offset) + Number(limit),
        ),
      });
    } catch (err) {
      console.error("Error in getpaymenthistory:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

/**
 * POST /dube/getcashouthistory.php
 * Role: dube-admin, dube-viewer
 */
router.post(
  "/getcashouthistory.php",
  checkRole(["dube-admin", "dube-viewer"]),
  (req, res) => {
    try {
      const { wallet, id } = req.body;
      if (!wallet || !id) {
        return sendError(res, 400, "Missing wallet or id.");
      }
      res.json({
        error: false,
        message: {
          wallet: "2299401133",
          name: "hello shop",
          mobile: "251900000000",
          bank: "Bank of Abyssinia",
          accountNumber: "1234567890",
          amount: "10.00",
          status: "PROCESSED",
          requestDate: "2024-11-15 14:46:27",
          transactionDate: "2024-11-15 14:46:27",
        },
      });
    } catch (err) {
      console.error("Error in getcashouthistory:", err);
      sendError(res, 500, "An internal server error occurred.");
    }
  },
);

module.exports = router;
