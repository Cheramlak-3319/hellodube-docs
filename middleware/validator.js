// middleware/validator.js
const { body, param, query, validationResult } = require("express-validator");
const { AppError, ErrorTypes } = require("./errorHandler");

// Validation rules
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      error: true,
      message: "Validation failed",
      errorCode: "VALIDATION_ERROR",
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    });
  };
};

// Auth validation rules
const authValidation = {
  register: [
    body("firstName")
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be 2-50 characters"),
    body("lastName")
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be 2-50 characters"),
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage("Password must contain at least one letter and one number"),
    body("role")
      .isIn([
        "dube-admin",
        "dube-viewer",
        "wfp-admin",
        "wfp-viewer",
        "wfp-operator",
      ])
      .withMessage("Invalid role"),
  ],

  login: [
    body("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  refresh: [
    body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  ],
};

// Cycle validation rules
const cycleValidation = {
  create: [
    body("categoryName").notEmpty().withMessage("Category name is required"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate")
      .isISO8601()
      .withMessage("Valid end date is required")
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
  ],

  update: [
    body("id").notEmpty().withMessage("Cycle ID is required"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("Valid end date required"),
    body("active")
      .optional()
      .isIn(["0", "1"])
      .withMessage("Active must be 0 or 1"),
  ],

  get: [query("id").optional().isString().withMessage("Invalid cycle ID")],
};

// Pagination validation
const paginationValidation = {
  list: [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be at least 1"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be 0 or greater"),
  ],
};

module.exports = {
  validate,
  authValidation,
  cycleValidation,
  paginationValidation,
};
