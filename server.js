// Add this at the top of server.js
if (process.env.NODE_ENV === "production") {
  // Fix for uuid ESM issue in Vercel
  const originalRequire = require;
  global.require = function (module) {
    if (module === "uuid") {
      return originalRequire("uuid");
    }
    return originalRequire(module);
  };
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const { verifyToken } = require("./middleware/auth");
const { extractToken } = require("./middleware/auth");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const dubeRoutes = require("./routes/dubeRoutes");
const wfpRoutes = require("./routes/wfpRoutes");
const {
  errorHandler,
  catchAsync,
  logger,
  errorDocumentation,
  AppError,
  ErrorTypes,
  RateLimitError,
} = require("./middleware/errorHandler");
const {
  requestLogger,
  metricsEndpoint,
} = require("./middleware/requestLogger");
const { configureSecurity, rateLimiters } = require("./middleware/security");
const {
  apiLimiter,
  authLimiter,
  uploadLimiter,
} = require("./middleware/rateLimiter");
const {
  validate,
  authValidation,
  cycleValidation,
  paginationValidation,
} = require("./middleware/validator");

const app = express();

// ==================== BASIC MIDDLEWARE ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5555",
      "https://hellodube-docs.vercel.app",
      /\.vercel\.app$/,
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Request-ID", "Retry-After"],
  }),
);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// ==================== SECURITY MIDDLEWARE ====================
configureSecurity(app);

// ==================== REQUEST LOGGING ====================
app.use(requestLogger);

// ==================== RATE LIMITING ====================
// Apply rate limiters in correct order (specific before general)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/", apiLimiter); // General API limiter last

// ==================== LOAD OPENAPI FILES ====================
const dubeFull = YAML.load(
  path.join(__dirname, "public", "openapi", "dube-full.yaml"),
);
const dubeReadOnly = YAML.load(
  path.join(__dirname, "public", "openapi", "dube-readonly.yaml"),
);
const wfpFull = YAML.load(
  path.join(__dirname, "public", "openapi", "wfp-full.yaml"),
);
const wfpReadOnly = YAML.load(
  path.join(__dirname, "public", "openapi", "wfp-readonly.yaml"),
);

// ==================== METRICS ENDPOINT ====================
app.get(
  "/api/metrics",
  verifyToken,
  catchAsync(async (req, res) => {
    if (req.user.role !== "dube-admin" && req.user.role !== "wfp-admin") {
      throw new AppError("Access denied", 403, ErrorTypes.AUTHORIZATION_ERROR);
    }
    metricsEndpoint(req, res);
  }),
);

// ==================== LOGOUT BUTTON MIDDLEWARE ====================
app.use((req, res, next) => {
  if (
    req.path.includes("/api-docs/") &&
    !req.path.match(/\.(css|js|png|ico|map)$/)
  ) {
    const originalSend = res.send;

    res.send = function (body) {
      if (typeof body === "string" && body.includes("</body>")) {
        const logoutHtml = `
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          <style>
            .logout-container {
              position: fixed;
              top: 24px;
              right: 24px;
              z-index: 10000;
              animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .logout-btn {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 20px;
              background: white;
              border: none;
              border-radius: 50px;
              cursor: pointer;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              font-weight: 500;
              color: #1e293b;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              border: 1px solid rgba(0, 0, 0, 0.05);
              backdrop-filter: blur(8px);
              background: rgba(255, 255, 255, 0.95);
            }
            .logout-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(220, 38, 38, 0.2);
              border-color: #dc2626;
            }
            .logout-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              background: #fee2e2;
              border-radius: 50%;
              color: #dc2626;
              transition: all 0.2s ease;
            }
            .logout-btn:hover .logout-icon {
              background: #dc2626;
              color: white;
            }
            .user-badge {
              position: fixed;
              top: 24px;
              left: 24px;
              z-index: 10000;
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              background: rgba(255, 255, 255, 0.9);
              backdrop-filter: blur(8px);
              border-radius: 50px;
              font-size: 13px;
              color: #1e293b;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
              border: 1px solid rgba(0, 0, 0, 0.05);
              animation: slideIn 0.3s ease-out;
            }
            .user-role {
              background: #2a7f62;
              color: white;
              padding: 2px 8px;
              border-radius: 30px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              margin-left: 4px;
            }
            @media (max-width: 640px) {
              .logout-container { top: 16px; right: 16px; }
              .user-badge { top: 16px; left: 16px; font-size: 12px; padding: 6px 12px; }
              .logout-btn { padding: 8px 16px; font-size: 13px; }
            }
          </style>
          <div class="user-badge" id="userBadge">
            <i class="fas fa-user-circle"></i>
            <span id="userName">Loading...</span>
            <span class="user-role" id="userRole"></span>
          </div>
          <div class="logout-container">
            <button class="logout-btn" id="logoutBtn">
              <span class="logout-icon"><i class="fas fa-sign-out-alt"></i></span>
              <span class="logout-text"><span>Sign Out</span><i class="fas fa-arrow-right"></i></span>
            </button>
          </div>
          <script>
            (function() {
              function getUserData() {
                try {
                  const token = localStorage.getItem('jwt-token');
                  const userStr = localStorage.getItem('user');
                  if (userStr) return JSON.parse(userStr);
                  if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    return { name: payload.email || 'User', role: payload.role || 'user' };
                  }
                  return null;
                } catch (e) { return null; }
              }
              function updateUserInfo() {
                const user = getUserData();
                if (user) {
                  document.getElementById('userName').textContent = (user.name || user.email || 'User').split('@')[0];
                  if (user.role) document.getElementById('userRole').textContent = user.role.replace('-', ' ');
                }
              }
              function handleLogout() {
                const btn = document.getElementById('logoutBtn');
                btn.classList.add('loading');
                localStorage.clear();
                setTimeout(() => window.location.href = '/login.html', 800);
              }
              function init() {
                updateUserInfo();
                document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
                document.addEventListener('keydown', (e) => {
                  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                    e.preventDefault();
                    handleLogout();
                  }
                });
              }
              document.readyState === 'loading' 
                ? document.addEventListener('DOMContentLoaded', init) 
                : init();
            })();
          </script>
        `;
        body = body.replace("</body>", logoutHtml + "</body>");
      }
      return originalSend.call(this, body);
    };
  }
  next();
});

// ==================== SWAGGER UI STATIC ASSETS ====================
app.use(
  "/api-docs",
  express.static(path.join(__dirname, "node_modules/swagger-ui-dist")),
);

// ==================== SWAGGER UI ROUTES ====================
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  app.use(routePath, swaggerUi.serve);

  app.get(
    routePath,
    catchAsync(async (req, res, next) => {
      const token = extractToken(req);
      if (!token) {
        throw new AppError(
          "No token provided",
          401,
          ErrorTypes.AUTHENTICATION_ERROR,
        );
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (err) {
        throw new AppError(
          "Invalid or expired token",
          401,
          ErrorTypes.AUTHENTICATION_ERROR,
        );
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          "Access denied",
          403,
          ErrorTypes.AUTHORIZATION_ERROR,
        );
      }

      swaggerUi.setup(swaggerDoc, {
        swaggerOptions: {
          persistAuthorization: true,
          authAction: {
            bearerAuth: {
              name: "bearerAuth",
              schema: { type: "apiKey", in: "header", name: "Authorization" },
              value: `Bearer ${token}`,
            },
          },
        },
      })(req, res, next);
    }),
  );
};

setupSwaggerRoute("/api-docs/dube/admin", dubeFull, ["dube-admin"]);
setupSwaggerRoute("/api-docs/dube/viewer", dubeReadOnly, ["dube-viewer"]);
setupSwaggerRoute("/api-docs/wfp/admin", wfpFull, ["wfp-admin"]);
setupSwaggerRoute("/api-docs/wfp/viewer", wfpReadOnly, ["wfp-viewer"]);

// ==================== HEALTH ENDPOINT ====================
app.get(
  "/health",
  catchAsync(async (req, res) => {
    res.json({
      status: "healthy",
      mongodb:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }),
);

// ==================== TEST ENDPOINTS ====================
app.get("/api/test/public", (req, res) => {
  res.json({ success: true, message: "Public endpoint" });
});

app.get(
  "/api/test/auth",
  verifyToken,
  catchAsync(async (req, res) => {
    res.json({ success: true, user: req.user });
  }),
);

// ==================== API ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/dube", verifyToken, dubeRoutes);
app.use("/api/wfp", verifyToken, wfpRoutes);

// ==================== 404 HANDLER ====================
app.all("*", (req, res) => {
  throw new AppError(
    `Can't find ${req.originalUrl} on this server`,
    404,
    ErrorTypes.NOT_FOUND_ERROR,
  );
});

// ==================== MONGODB CONNECTION ====================
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    logger.info("✅ Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new AppError(
        "MONGO_URI not defined",
        500,
        ErrorTypes.INTERNAL_ERROR,
      );
    }

    logger.info("🔄 Connecting to MongoDB...");
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
      })
      .then((mongoose) => {
        logger.info("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((err) => {
        logger.error("❌ MongoDB connection error:", err.message);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

// Database connection middleware
app.use(
  catchAsync(async (req, res, next) => {
    const publicPaths = [
      "/health",
      "/api/test/public",
      "/login.html",
      "/api/auth/login",
      "/api/auth/register",
      "/api-docs",
    ];

    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    if (
      req.path.includes("/api-docs/") &&
      req.path.match(/\.(css|js|png|ico|map)$/)
    ) {
      return next();
    }

    await connectDB();
    next();
  }),
);

// ==================== ERROR HANDLING ====================
// This must be the LAST middleware
app.use(errorHandler);

// ==================== VERCEL SERVERLESS EXPORT ====================
module.exports = app;

// ==================== LOCAL DEVELOPMENT SERVER ====================
if (require.main === module) {
  (async () => {
    try {
      logger.info("🚀 Starting server...");
      await connectDB();

      const PORT = process.env.PORT || 5555;
      const server = app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(
          `📘 Dube Admin Swagger: http://localhost:${PORT}/api-docs/dube/admin`,
        );
        logger.info(
          `📘 Dube Viewer Swagger: http://localhost:${PORT}/api-docs/dube/viewer`,
        );
        logger.info(
          `📘 WFP Admin Swagger: http://localhost:${PORT}/api-docs/wfp/admin`,
        );
        logger.info(
          `📘 WFP Viewer Swagger: http://localhost:${PORT}/api-docs/wfp/viewer`,
        );
        logger.info(`🔐 Login page: http://localhost:${PORT}/login.html`);
      });

      server.on("error", (err) => {
        logger.error("❌ Server error:", err);
        process.exit(1);
      });

      // Graceful shutdown
      process.on("SIGTERM", () => {
        logger.info("🛑 SIGTERM received, shutting down gracefully");
        server.close(() => {
          mongoose.connection.close(false, () => {
            logger.info("👋 Database connection closed");
            process.exit(0);
          });
        });
      });
    } catch (err) {
      logger.error("❌ Failed to start server:", err);
      process.exit(1);
    }
  })();
}
