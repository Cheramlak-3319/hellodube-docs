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
app.use(express.static(path.join(__dirname, "public")));

// Load generated OpenAPI files - using __dirname for reliable paths
// Load generated OpenAPI files from public folder
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

// ========== SWAGGER UI ROUTES - FIXED ==========

// Serve static assets without authentication
app.use("/api-docs", (req, res, next) => {
  // Allow all static files (CSS, JS, JSON, images)
  if (req.path.match(/\.(css|js|json|png|ico|map)$/)) {
    return next();
  }
  next();
});

// Helper to set up each Swagger route
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  // Serve the static assets using swagger-ui-express
  app.use(routePath, swaggerUi.serve);

  // Handle the main page with authentication
  app.get(routePath, (req, res, next) => {
    // Extract token from query or header
    const token = extractToken(req);

    if (!token) {
      return res
        .status(401)
        .json({ error: true, message: "No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid or expired token." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: true, message: "Access denied." });
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

// ========== MONGODB CONNECTION (cached for serverless) ==========

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log("✅ Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("❌ MONGO_URI is not defined in environment variables");
    }

    console.log("🔄 Connecting to MongoDB...");

    // ✅ FIXED: Remove invalid options, use only valid ones
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000, // Keep this one – it's valid
      })
      .then((mongoose) => {
        console.log("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        cached.promise = null; // Reset so future attempts can retry
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

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  // Skip database for public/test endpoints that don't need it
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

  // Also skip static assets for Swagger UI
  if (
    req.path.includes("/api-docs/") &&
    req.path.match(/\.(css|js|png|ico|map)$/)
  ) {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    res.status(503).json({
      error: true,
      message: "Service temporarily unavailable - database connection failed",
    });
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
