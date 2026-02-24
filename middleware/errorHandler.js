// middleware/errorHandler.js - SIMPLIFIED VERSION
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

const ErrorTypes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  DUPLICATE_ERROR: "DUPLICATE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// Simple error handler - NO external dependencies
const errorHandler = (err, req, res, next) => {
  // Don't use logger here - it might cause issues
  console.error(`❌ Error: ${err.message}`);

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || ErrorTypes.INTERNAL_ERROR;

  res.status(statusCode).json({
    error: true,
    message: err.message || "Internal server error",
    errorCode,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Simple catchAsync - no try-catch needed here
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ErrorTypes,
  errorHandler,
  catchAsync,
};
