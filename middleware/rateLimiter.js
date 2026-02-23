// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// Use the built-in IP key generator that properly handles IPv6
const { ipKeyGenerator } = rateLimit;

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: true,
    message: "Too many requests, please try again later",
    errorCode: "RATE_LIMIT_ERROR",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator, // Use built-in IPv6-compatible generator
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: true,
    message: "Too many failed attempts, please try again later",
    errorCode: "RATE_LIMIT_ERROR",
    timestamp: new Date().toISOString(),
  },
  keyGenerator: (req) => {
    // Use email for auth attempts
    if (req.body?.email) {
      return req.body.email.toLowerCase().trim();
    }
    // Fallback to built-in IP generator
    return ipKeyGenerator(req);
  },
});

// Upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: true,
    message: "Upload limit exceeded, please try again later",
    errorCode: "RATE_LIMIT_ERROR",
    timestamp: new Date().toISOString(),
  },
  keyGenerator: ipKeyGenerator, // Use built-in IPv6-compatible generator
});

// Create custom limiter factory
const createCustomLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      error: true,
      message: "Too many requests",
      errorCode: "RATE_LIMIT_ERROR",
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ipKeyGenerator,
    ...options,
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  createCustomLimiter,
};
