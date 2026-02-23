// middleware/security.js
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const responseTime = require("response-time");
const rateLimit = require("express-rate-limit");

// Use built-in IP key generator
const { ipKeyGenerator } = rateLimit;

// Security middleware configuration
const configureSecurity = (app) => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://cdnjs.cloudflare.com",
          ],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(mongoSanitize());
  app.use(xss());
  app.use(hpp());

  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use(
    responseTime((req, res, time) => {
      if (time > 1000) {
        console.warn(
          `⚠️ Slow request: ${req.method} ${req.url} - ${time.toFixed(2)}ms`,
        );
      }
    }),
  );
};

// Rate limiting configuration
const createRateLimiter = (options = {}) => {
  const { useEmailKey, ...validOptions } = options;

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      error: true,
      message: options.message || "Too many requests, please try again later.",
      errorCode: "RATE_LIMIT_ERROR",
      retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (req.user?.userId) {
        return req.user.userId;
      }
      if (options.useEmailKey && req.body?.email) {
        return req.body.email.toLowerCase().trim();
      }
      return ipKeyGenerator(req);
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    ...validOptions,
  });
};

const rateLimiters = {
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),

  auth: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    useEmailKey: true,
  }),

  register: createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
  }),

  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
  }),

  public: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
  }),
};

module.exports = {
  configureSecurity,
  rateLimiters,
};
