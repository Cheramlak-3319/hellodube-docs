// middleware/errorHandler.js
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const Sentry = require("@sentry/node");
const { v4: uuidv4 } = require("uuid");

// ==================== Winston Logger Configuration ====================

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to Winston
winston.addColors(logColors);

// Create format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(
    ({ timestamp, level, message, service, requestId, ...meta }) => {
      const serviceInfo = service ? `[${service}]` : "";
      const requestInfo = requestId ? `[Req: ${requestId}]` : "";
      const metaInfo = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";

      return `${timestamp} ${level.toUpperCase()} ${serviceInfo} ${requestInfo}: ${message}${metaInfo}`;
    },
  ),
);

// Create transports based on environment
const getTransports = () => {
  const transports = [];

  // Console transport (all environments)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        logFormat,
      ),
      level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === "production" ? "info" : "debug"),
    }),
  );

  // File transports (production only)
  if (process.env.NODE_ENV === "production") {
    // Error logs
    transports.push(
      new DailyRotateFile({
        filename: "logs/error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "14d",
        format: winston.format.combine(winston.format.uncolorize(), logFormat),
      }),
    );

    // Combined logs
    transports.push(
      new DailyRotateFile({
        filename: "logs/combined-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "30d",
        format: winston.format.combine(winston.format.uncolorize(), logFormat),
      }),
    );

    // HTTP logs (for request/response)
    transports.push(
      new DailyRotateFile({
        filename: "logs/http-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "http",
        maxSize: "20m",
        maxFiles: "7d",
        format: winston.format.combine(winston.format.uncolorize(), logFormat),
      }),
    );
  }

  return transports;
};

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  transports: getTransports(),
  defaultMeta: { service: "api-service" },
  exitOnError: false,
});

// Create stream for Morgan (if you're using it)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// ==================== Sentry Configuration ====================

// Initialize Sentry (only in production)
if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.2,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: require("express") }),
    ],
  });

  logger.info("Sentry initialized for error tracking");
}

// ==================== Custom Rate Limit Error ====================

class RateLimitError extends Error {
  constructor(message = "Too many requests", retryAfter = 60) {
    super(message);
    this.name = "RateLimitError";
    this.statusCode = 429;
    this.errorCode = "RATE_LIMIT_ERROR";
    this.retryAfter = retryAfter;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// ==================== AppError Class ====================

class AppError extends Error {
  constructor(message, statusCode, errorCode = null, metadata = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ==================== Error Types ====================

const ErrorTypes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  DUPLICATE_ERROR: "DUPLICATE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BUSINESS_LOGIC_ERROR: "BUSINESS_LOGIC_ERROR",
  THIRD_PARTY_ERROR: "THIRD_PARTY_ERROR",
};

// ==================== Error Logger Helper ====================

const logError = (err, req = null) => {
  const errorData = {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    isOperational: err.isOperational,
    timestamp: err.timestamp,
    metadata: err.metadata,
  };

  // Add request context if available
  if (req) {
    errorData.request = {
      id: req.id,
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
    };
  }

  // Log based on error severity
  if (err.statusCode >= 500) {
    logger.error("Server Error:", errorData);
  } else if (err.statusCode >= 400) {
    logger.warn("Client Error:", errorData);
  } else {
    logger.info("Operational Error:", errorData);
  }

  // Send to Sentry in production
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (req) {
        scope.setUser({ id: req.user?.userId, email: req.user?.email });
        scope.setTag("request_id", req.id);
        scope.setTag("error_code", err.errorCode);
        scope.setContext("request", {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
        });
      }

      if (err.metadata) {
        scope.setContext("metadata", err.metadata);
      }

      Sentry.captureException(err);
    });
  }
};

// ==================== Global Error Handler Middleware ====================

const errorHandler = (err, req, res, next) => {
  // Log the error with context
  logError(err, req);

  // Default error
  let error = {
    message: err.message || "Internal server error",
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode || ErrorTypes.INTERNAL_ERROR,
    timestamp: err.timestamp || new Date().toISOString(),
    retryAfter: err.retryAfter,
  };

  // Mongoose validation error
  if (err.name === "ValidationError") {
    error.message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    error.statusCode = 400;
    error.errorCode = ErrorTypes.VALIDATION_ERROR;
    error.fields = Object.keys(err.errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error.message = `${field} already exists`;
    error.statusCode = 409;
    error.errorCode = ErrorTypes.DUPLICATE_ERROR;
    error.field = field;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    error.statusCode = 401;
    error.errorCode = ErrorTypes.AUTHENTICATION_ERROR;
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired";
    error.statusCode = 401;
    error.errorCode = ErrorTypes.AUTHENTICATION_ERROR;
  }

  // MongoDB connection error
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    error.message = "Database connection error";
    error.statusCode = 503;
    error.errorCode = ErrorTypes.DATABASE_ERROR;
  }

  // Rate limit error
  if (err instanceof RateLimitError) {
    error.message = err.message;
    error.statusCode = 429;
    error.errorCode = ErrorTypes.RATE_LIMIT_ERROR;
    res.set("Retry-After", err.retryAfter);
  }

  // Send response
  const response = {
    error: true,
    message: error.message,
    errorCode: error.errorCode,
    timestamp: error.timestamp,
    requestId: req.id,
  };

  // Add retry-after for rate limit errors
  if (error.retryAfter) {
    response.retryAfter = error.retryAfter;
  }

  // Add field info for validation/duplicate errors
  if (error.fields) {
    response.fields = error.fields;
  }
  if (error.field) {
    response.field = error.field;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.fullError = err;
  }

  res.status(error.statusCode).json(response);
};

// ==================== Async Wrapper ====================

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      // Ensure request ID is passed
      err.requestId = req.id;
      next(err);
    });
  };
};

// ==================== Error Documentation for Swagger ====================

const errorDocumentation = {
  // Common error responses that can be referenced in Swagger
  responses: {
    BadRequest: {
      description: "Bad request - Invalid parameters",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "Validation failed" },
              errorCode: { type: "string", example: "VALIDATION_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: {
                type: "string",
                example: "550e8400-e29b-41d4-a716-446655440000",
              },
              fields: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    Unauthorized: {
      description: "Unauthorized - Invalid or missing token",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "Invalid token" },
              errorCode: { type: "string", example: "AUTHENTICATION_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: { type: "string" },
            },
          },
        },
      },
    },
    Forbidden: {
      description: "Forbidden - Insufficient permissions",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "Access denied" },
              errorCode: { type: "string", example: "AUTHORIZATION_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: { type: "string" },
            },
          },
        },
      },
    },
    NotFound: {
      description: "Resource not found",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "Resource not found" },
              errorCode: { type: "string", example: "NOT_FOUND_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: { type: "string" },
            },
          },
        },
      },
    },
    Conflict: {
      description: "Resource conflict - Duplicate entry",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "email already exists" },
              errorCode: { type: "string", example: "DUPLICATE_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: { type: "string" },
              field: { type: "string", example: "email" },
            },
          },
        },
      },
    },
    TooManyRequests: {
      description: "Rate limit exceeded",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "Too many requests" },
              errorCode: { type: "string", example: "RATE_LIMIT_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: { type: "string" },
              retryAfter: { type: "number", example: 60 },
            },
          },
        },
      },
      headers: {
        "Retry-After": {
          schema: {
            type: "integer",
            description: "Seconds to wait before retrying",
          },
        },
      },
    },
    ServerError: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "boolean", example: true },
              message: { type: "string", example: "Internal server error" },
              errorCode: { type: "string", example: "INTERNAL_ERROR" },
              timestamp: { type: "string", format: "date-time" },
              requestId: { type: "string" },
            },
          },
        },
      },
    },
  },
};

// ==================== Module Exports ====================

module.exports = {
  AppError,
  RateLimitError,
  ErrorTypes,
  errorHandler,
  catchAsync,
  logger,
  logError,
  errorDocumentation,
};
