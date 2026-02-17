const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const { verifyToken, checkRole } = require("./middleware/auth");
const { extractToken } = require("./middleware/auth");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const dubeRoutes = require("./routes/dubeRoutes");
const wfpRoutes = require("./routes/wfpRoutes");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5555",
      "https://hellodube-docs.vercel.app",
      /\.vercel\.app$/,
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Serve static login page
app.use(express.static(path.resolve("public")));

// Load generated OpenAPI files
const dubeFull = YAML.load(path.resolve("openapi/dube-full.yaml"));
const dubeReadOnly = YAML.load(path.resolve("openapi/dube-readonly.yaml"));
const wfpFull = YAML.load(path.resolve("openapi/wfp-full.yaml"));
const wfpReadOnly = YAML.load(path.resolve("openapi/wfp-readonly.yaml"));

// ========== SWAGGER UI ROUTES - FIXED ==========

// Helper to set up each Swagger route properly
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  // 1. Serve static assets (CSS, JS, images) - NO AUTH REQUIRED
  const serveFiles = swaggerUi.serveFiles(swaggerDoc, {
    swaggerOptions: { persistAuthorization: true },
  });

  // This handles all sub-requests (like .css, .js, .png)
  app.use(routePath, (req, res, next) => {
    // Let swagger-ui-express handle static files
    serveFiles(req, res, next);
  });

  // 2. Main page - REQUIRES AUTHENTICATION
  app.get(routePath, (req, res, next) => {
    // Extract token from query or header
    const token = extractToken(req);

    if (!token) {
      return res
        .status(401)
        .json({ error: true, message: "No token provided." });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid or expired token." });
    }

    // Check role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: "Access denied. Insufficient permissions.",
      });
    }

    // Serve Swagger UI with token pre‑authorized
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
  });
};

// Set up all four routes
setupSwaggerRoute("/api-docs/dube/admin", dubeFull, ["dube-admin"]);
setupSwaggerRoute("/api-docs/dube/viewer", dubeReadOnly, ["dube-viewer"]);
setupSwaggerRoute("/api-docs/wfp/admin", wfpFull, ["wfp-admin"]);
setupSwaggerRoute("/api-docs/wfp/viewer", wfpReadOnly, ["wfp-viewer"]);

// ---------- HEALTH ----------
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

// ---------- TEST ENDPOINTS ----------
app.get("/api/test/public", (req, res) => {
  res.json({ success: true, message: "Public endpoint" });
});
app.get("/api/test/auth", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ---------- API ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/dube", verifyToken, dubeRoutes);
app.use("/api/wfp", verifyToken, wfpRoutes);

// ---------- MONGODB CONNECTION (cached for serverless) ----------
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI)
      .then((mongoose) => {
        console.log("✅ MongoDB connected");
        return mongoose;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Middleware to ensure DB is connected before any request (optional but safe)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection middleware error:", err);
    res
      .status(500)
      .json({ error: true, message: "Database connection failed" });
  }
});

// ---------- VERCEL SERVERLESS EXPORT ----------
module.exports = app;

// ---------- LOCAL DEVELOPMENT SERVER ----------
if (require.main === module) {
  (async () => {
    try {
      console.log("🚀 Starting server...");
      await connectDB();

      const PORT = process.env.PORT || 5555;
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(
          `📘 Dube Admin Swagger: http://localhost:${PORT}/api-docs/dube/admin`,
        );
        console.log(
          `📘 Dube Viewer Swagger: http://localhost:${PORT}/api-docs/dube/viewer`,
        );
        console.log(
          `📘 WFP Admin Swagger: http://localhost:${PORT}/api-docs/wfp/admin`,
        );
        console.log(
          `📘 WFP Viewer Swagger: http://localhost:${PORT}/api-docs/wfp/viewer`,
        );
        console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
      });

      server.on("error", (err) => {
        console.error("❌ Server error:", err);
        process.exit(1);
      });
    } catch (err) {
      console.error("❌ Failed to start server:", err);
      process.exit(1);
    }
  })();
}
