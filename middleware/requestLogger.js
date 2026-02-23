// middleware/requestLogger.js
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const os = require("os");

// Dynamic import for uuid (works in both CommonJS and ESM)
let uuidv4;
(async () => {
  try {
    const uuid = await import("uuid");
    uuidv4 = uuid.v4;
    console.log("✅ UUID loaded successfully");
  } catch (error) {
    console.warn("⚠️ Failed to import uuid, using fallback ID generator");
  }
})();

// Fallback ID generator
const generateFallbackId = () => {
  return "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
};

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

// Create custom format for structured JSON logs
const structuredLogFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format((info) => {
    // Add hostname and process info
    info.hostname = os.hostname();
    info.pid = process.pid;
    info.environment = process.env.NODE_ENV || "development";
    info.version = process.env.npm_package_version || "1.0.0";

    // Sanitize sensitive data
    if (info.body) {
      const safeBody = { ...info.body };
      if (safeBody.password) safeBody.password = "******";
      if (safeBody.refreshToken) safeBody.refreshToken = "******";
      if (safeBody.token) safeBody.token = "******";
      info.body = safeBody;
    }

    return info;
  })(),
  winston.format.json(), // Structured JSON logs
);

// Console format for development (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({
      timestamp,
      level,
      message,
      requestId,
      method,
      url,
      statusCode,
      duration,
      ...meta
    }) => {
      const reqInfo = requestId ? `[${requestId}]` : "";
      const methodInfo = method ? `${method}` : "";
      const urlInfo = url ? `${url}` : "";
      const statusInfo = statusCode ? `| ${statusCode}` : "";
      const durationInfo = duration ? `| ${duration}ms` : "";

      return `${timestamp} ${level} ${reqInfo} ${methodInfo} ${urlInfo} ${statusInfo} ${durationInfo}: ${message}`;
    },
  ),
);

// Create transports based on environment
const getTransports = () => {
  const transports = [];

  // Console transport (all environments)
  transports.push(
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? winston.format.combine(
              winston.format.uncolorize(),
              structuredLogFormat,
            )
          : consoleFormat,
      level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === "production" ? "info" : "debug"),
    }),
  );

  // File transports (production only)
  if (process.env.NODE_ENV === "production") {
    // Error logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: "logs/error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "30d",
        format: structuredLogFormat,
        zippedArchive: true,
      }),
    );

    // Combined logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: "logs/combined-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "90d",
        format: structuredLogFormat,
        zippedArchive: true,
      }),
    );

    // HTTP access logs - daily rotation
    transports.push(
      new DailyRotateFile({
        filename: "logs/access-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "http",
        maxSize: "20m",
        maxFiles: "30d",
        format: structuredLogFormat,
        zippedArchive: true,
      }),
    );

    // Application metrics
    transports.push(
      new DailyRotateFile({
        filename: "logs/metrics-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "info",
        maxSize: "20m",
        maxFiles: "7d",
        format: structuredLogFormat,
        zippedArchive: true,
      }),
    );
  }

  return transports;
};

// Create Winston logger instance
const logger = winston.createLogger({
  levels: logLevels,
  format: structuredLogFormat,
  transports: getTransports(),
  defaultMeta: { service: "helloopass-api" },
  exitOnError: false,
});

// ==================== Metrics Collector ====================

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, byMethod: {}, byPath: {}, byStatus: {} },
      responseTime: { total: 0, count: 0, min: Infinity, max: 0 },
      errors: { total: 0, byType: {} },
      startTime: Date.now(),
    };
  }

  recordRequest(req, res, duration) {
    this.metrics.requests.total++;

    // Record by method
    const method = req.method;
    this.metrics.requests.byMethod[method] =
      (this.metrics.requests.byMethod[method] || 0) + 1;

    // Record by path (simplified)
    const path = req.route?.path || req.path;
    this.metrics.requests.byPath[path] =
      (this.metrics.requests.byPath[path] || 0) + 1;

    // Record by status
    const status = res.statusCode;
    this.metrics.requests.byStatus[status] =
      (this.metrics.requests.byStatus[status] || 0) + 1;

    // Response time metrics
    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.min = Math.min(
      this.metrics.responseTime.min,
      duration,
    );
    this.metrics.responseTime.max = Math.max(
      this.metrics.responseTime.max,
      duration,
    );

    // Error tracking
    if (status >= 400) {
      this.metrics.errors.total++;
      const errorType = status >= 500 ? "server" : "client";
      this.metrics.errors.byType[errorType] =
        (this.metrics.errors.byType[errorType] || 0) + 1;
    }
  }

  getStats() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime =
      this.metrics.responseTime.count > 0
        ? this.metrics.responseTime.total / this.metrics.responseTime.count
        : 0;

    return {
      uptime: Math.floor(uptime / 1000),
      requests: this.metrics.requests.total,
      requestsPerSecond: (
        this.metrics.requests.total /
        (uptime / 1000)
      ).toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(2),
      minResponseTime:
        this.metrics.responseTime.min === Infinity
          ? 0
          : this.metrics.responseTime.min,
      maxResponseTime: this.metrics.responseTime.max,
      errors: this.metrics.errors.total,
      errorRate:
        (
          (this.metrics.errors.total / this.metrics.requests.total) *
          100
        ).toFixed(2) + "%",
    };
  }

  logMetrics() {
    const stats = this.getStats();
    logger.info("📊 Application Metrics", { metrics: stats });

    // Log detailed metrics in production
    if (process.env.NODE_ENV === "production") {
      logger.info("📈 Detailed Metrics", {
        metrics: {
          byMethod: this.metrics.requests.byMethod,
          byStatus: this.metrics.requests.byStatus,
          errorsByType: this.metrics.errors.byType,
        },
      });
    }
  }
}

// Create global metrics collector
const metricsCollector = new MetricsCollector();

// Log metrics every 5 minutes in production
if (process.env.NODE_ENV === "production") {
  setInterval(
    () => {
      metricsCollector.logMetrics();
    },
    5 * 60 * 1000,
  );
}

// ==================== Request Logger Middleware ====================

const requestLogger = (req, res, next) => {
  // Generate unique request ID using dynamic import or fallback
  req.id = uuidv4 ? uuidv4() : generateFallbackId();

  // Add request ID to response headers
  res.setHeader("X-Request-ID", req.id);

  const start = Date.now();

  // Prepare log data
  const logData = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    referer: req.get("referer"),
  };

  // Add user info if authenticated
  if (req.user) {
    logData.userId = req.user.userId;
    logData.userEmail = req.user.email;
    logData.userRole = req.user.role;
  }

  // Log request (http level)
  logger.http(`📥 Incoming request`, logData);

  // Log safe body in development
  if (
    process.env.NODE_ENV === "development" &&
    req.body &&
    Object.keys(req.body).length
  ) {
    const safeBody = { ...req.body };

    // Remove sensitive fields
    if (safeBody.password) safeBody.password = "******";
    if (safeBody.refreshToken) safeBody.refreshToken = "******";
    if (safeBody.token) safeBody.token = "******";

    logger.debug(`📦 Request body`, { requestId: req.id, body: safeBody });
  }

  // Capture response
  const originalSend = res.send;
  let responseBody;

  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    // Prepare response log data
    const responseLogData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration,
      contentLength: res.get("content-length"),
    };

    // Log response
    if (res.statusCode >= 400) {
      logger.error(`❌ Request failed`, responseLogData);

      // Log error response body in development
      if (process.env.NODE_ENV === "development" && responseBody) {
        try {
          const parsedBody =
            typeof responseBody === "string"
              ? JSON.parse(responseBody)
              : responseBody;
          logger.debug(`📤 Error response body`, {
            requestId: req.id,
            body: parsedBody,
          });
        } catch (e) {
          // Ignore parse errors
        }
      }
    } else {
      logger.http(`📤 Request completed`, responseLogData);
    }

    // Record metrics
    metricsCollector.recordRequest(req, res, duration);
  });

  next();
};

// ==================== Metrics Endpoint ====================

const metricsEndpoint = (req, res) => {
  const stats = metricsCollector.getStats();
  res.json({
    success: true,
    metrics: stats,
    detailed:
      process.env.NODE_ENV === "development"
        ? metricsCollector.metrics
        : undefined,
  });
};

// ==================== Module Exports ====================

module.exports = {
  requestLogger,
  logger,
  metricsCollector,
  metricsEndpoint,
};
