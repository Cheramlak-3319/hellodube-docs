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

app.get("/api/debug/env", (req, res) => {
  res.json({
    env: process.env.NODE_ENV,
    mongoUri: process.env.MONGO_URI ? "✅ Set" : "❌ Missing",
    jwtSecret: process.env.JWT_SECRET ? "✅ Set" : "❌ Missing",
    emailUser: process.env.EMAIL_USER ? "✅ Set" : "❌ Missing",
    emailPass: process.env.EMAIL_PASS ? "✅ Set" : "❌ Missing",
    baseUrl: process.env.BASE_URL || "❌ Missing",
  });
});

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

app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   LOAD OPENAPI FILES
========================================================= */

// Add this temporary test endpoint
app.get("/api/test/email", async (req, res) => {
  try {
    // ✅ IMPORT nodemailer HERE

    const testTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await testTransporter.verify();
    res.json({ success: true, message: "SMTP connection successful" });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

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
   SWAGGER UI ROUTES
========================================================= */

const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  app.use(routePath, swaggerUi.serve);

  app.get(routePath, (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: true,
        message: "No token provided.",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid or expired token.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: "Access denied.",
      });
    }

    swaggerUi.setup(swaggerDoc, {
      swaggerOptions: {
        persistAuthorization: true,
        authAction: {
          bearerAuth: {
            name: "bearerAuth",
            schema: {
              type: "apiKey",
              in: "header",
              name: "Authorization",
            },
            value: `Bearer ${token}`,
          },
        },
      },
    })(req, res, next);
  });
};

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
   API ROUTES (REGISTERED ONLY ONCE)
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
