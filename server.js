const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { verifyToken, extractToken } = require("./middleware/auth");

const authRoutes = require("./routes/authRoutes");
const dubeRoutes = require("./routes/dubeRoutes");
const wfpRoutes = require("./routes/wfpRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

/* =========================================================
   BASIC MIDDLEWARE
========================================================= */

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

/* =========================================================
   SERVE STATIC FILES - THIS IS CRITICAL FOR login.html
========================================================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   SERVE SWAGGER STATIC ASSETS
========================================================= */
app.use(
  "/api-docs",
  express.static(path.join(__dirname, "node_modules/swagger-ui-dist")),
);

/* =========================================================
   LOAD OPENAPI FILES
========================================================= */
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

/* =========================================================
   SWAGGER UI ROUTES (THESE COME AFTER STATIC ASSETS)
========================================================= */

// Helper to set up each Swagger route
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  // First, serve the Swagger UI interface (this handles the HTML page)
  app.use(routePath, swaggerUi.serve);

  // Then handle the main page WITH authentication
  app.get(routePath, (req, res, next) => {
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

    // Swagger UI options
    const swaggerOptions = {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        authAction: {
          bearerAuth: {
            name: "bearerAuth",
            schema: { type: "apiKey", in: "header", name: "Authorization" },
            value: `Bearer ${token}`,
          },
        },
      },
      customSiteTitle: `Dube API - ${req.user.role}`,
      customCss: ".swagger-ui .topbar { display: none; }",
    };

    // Serve Swagger UI with the options
    swaggerUi.setup(swaggerDoc, swaggerOptions)(req, res, next);
  });
};

// Set up all four routes
setupSwaggerRoute("/api-docs/dube/admin", dubeFull, ["dube-admin"]);
setupSwaggerRoute("/api-docs/dube/viewer", dubeReadOnly, ["dube-viewer"]);
setupSwaggerRoute("/api-docs/wfp/admin", wfpFull, ["wfp-admin"]);
setupSwaggerRoute("/api-docs/wfp/viewer", wfpReadOnly, ["wfp-viewer"]);

/* =========================================================
   HEALTH & TEST
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

app.get("/api/test/public", (req, res) => {
  res.json({ success: true, message: "Public endpoint" });
});

app.get("/api/test/auth", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* =========================================================
   MONGODB CONNECTION (CACHED FOR SERVERLESS)
========================================================= */

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not defined");

    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .then((mongoose) => mongoose)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/* =========================================================
   DB CONNECTION MIDDLEWARE
========================================================= */

app.use(async (req, res, next) => {
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

  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      error: true,
      message: "Database connection failed",
    });
  }
});

/* =========================================================
   API ROUTES
========================================================= */

app.use("/api/auth", authRoutes);
app.use("/api/dube", verifyToken, dubeRoutes);
app.use("/api/wfp", verifyToken, wfpRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/admin", verifyToken, adminRoutes);

/* =========================================================
   SERVER EXPORT
========================================================= */

module.exports = app;

/* =========================================================
   LOCAL DEVELOPMENT SERVER
========================================================= */

if (require.main === module) {
  (async () => {
    try {
      await connectDB();

      const PORT = process.env.PORT || 5555;

      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(
          `📘 Dube Admin: http://localhost:${PORT}/api-docs/dube/admin`,
        );
        console.log(
          `📘 Dube Viewer: http://localhost:${PORT}/api-docs/dube/viewer`,
        );
        console.log(
          `📘 WFP Admin: http://localhost:${PORT}/api-docs/wfp/admin`,
        );
        console.log(
          `📘 WFP Viewer: http://localhost:${PORT}/api-docs/wfp/viewer`,
        );
        console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
      });
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  })();
}
