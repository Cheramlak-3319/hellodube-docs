const express = require("express");
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

// ---------- MIDDLEWARE ----------
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
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/api-docs",
  express.static(path.join(__dirname, "node_modules/swagger-ui-dist")),
);

// ---------- LOAD OPENAPI FILES ----------
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

// ---------- SWAGGER UI ROUTES (with logout button injection) ----------
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  app.use(routePath, swaggerUi.serve);
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

    const userEmail = req.user.email || "User";
    const userRole = req.user.role || "user";
    const userName = userEmail.split("@")[0];
    const userInitials = userName
      .split(/[._-]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    const originalSend = res.send;
    res.send = function (body) {
      if (typeof body === "string" && body.includes("</body>")) {
        const logoutHtml = `
          <style>
            .user-info-badge {
              position: fixed;
              top: 20px;
              left: 20px;
              z-index: 9999;
              background: rgba(255,255,255,0.95);
              backdrop-filter: blur(8px);
              border-radius: 50px;
              padding: 8px 16px;
              display: flex;
              align-items: center;
              gap: 10px;
              font-family: sans-serif;
              border: 1px solid rgba(0,0,0,0.05);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .user-avatar {
              width: 32px;
              height: 32px;
              background: linear-gradient(135deg, #00a884, #0072ce);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
            }
            .user-name { font-weight: 600; font-size: 14px; color: #1e293b; }
            .user-role { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .logout-container {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 9999;
            }
            .logout-btn {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 20px;
              background: white;
              border: none;
              border-radius: 50px;
              cursor: pointer;
              font-family: sans-serif;
              font-size: 14px;
              font-weight: 500;
              color: #1e293b;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              border: 1px solid rgba(0,0,0,0.05);
              backdrop-filter: blur(8px);
            }
            .logout-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(220,38,38,0.2);
              border-color: #dc2626;
            }
            .logout-icon {
              width: 28px;
              height: 28px;
              background: #fee2e2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #dc2626;
            }
            .logout-btn:hover .logout-icon { background: #dc2626; color: white; }
            .logout-text { position: relative; overflow: hidden; }
            .logout-text span { display: inline-block; transition: transform 0.2s; }
            .logout-btn:hover .logout-text span { transform: translateX(-4px); }
            .logout-text i {
              position: absolute;
              right: -20px;
              top: 50%;
              transform: translateY(-50%);
              opacity: 0;
              transition: all 0.2s;
              font-size: 12px;
              color: #dc2626;
            }
            .logout-btn:hover .logout-text i { right: -16px; opacity: 1; }
            .logout-btn.loading { pointer-events: none; opacity: 0.8; }
            .logout-btn.loading .logout-icon { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @media (max-width: 640px) {
              .user-info-badge { top: 16px; left: 16px; padding: 6px 12px; }
              .logout-container { top: 16px; right: 16px; }
              .logout-btn { padding: 8px 16px; font-size: 13px; }
              .user-avatar { width: 28px; height: 28px; font-size: 12px; }
            }
          </style>
          <div class="user-info-badge">
            <div class="user-avatar">${userInitials}</div>
            <div class="user-details">
              <span class="user-name">${userName}</span>
              <span class="user-role">${userRole.replace("-", " ")}</span>
            </div>
          </div>
          <div class="logout-container">
            <button class="logout-btn" id="swaggerLogoutBtn">
              <span class="logout-icon"><i class="fas fa-sign-out-alt"></i></span>
              <span class="logout-text"><span>Sign Out</span><i class="fas fa-arrow-right"></i></span>
            </button>
          </div>
          <script>
            (function() {
              const btn = document.getElementById('swaggerLogoutBtn');
              if (btn) btn.addEventListener('click', function(e) {
                e.preventDefault();
                this.classList.add('loading');
                localStorage.clear();
                setTimeout(() => window.location.href = '/login.html', 800);
              });
              document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'L') { e.preventDefault(); btn?.click(); }
              });
            })();
          </script>
        `;
        body = body.replace("</body>", logoutHtml + "</body>");
      }
      return originalSend.call(this, body);
    };

    swaggerUi.setup(swaggerDoc, {
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
      customSiteTitle: `Dube API - ${userRole}`,
      customCss: ".swagger-ui .topbar { display: none; }",
    })(req, res, next);
  });
};

setupSwaggerRoute("/api-docs/dube/admin", dubeFull, ["dube-admin"]);
setupSwaggerRoute("/api-docs/dube/viewer", dubeReadOnly, ["dube-viewer"]);
setupSwaggerRoute("/api-docs/wfp/admin", wfpFull, ["wfp-admin"]);
setupSwaggerRoute("/api-docs/wfp/viewer", wfpReadOnly, ["wfp-viewer"]);

// ---------- HEALTH & TEST ----------
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

// ---------- MONGODB CONNECTION (CACHED FOR SERVERLESS) ----------
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
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((mongoose) => mongoose)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ---------- DB CONNECTION MIDDLEWARE ----------
app.use(async (req, res, next) => {
  const publicPaths = [
    "/health",
    "/api/test/public",
    "/login.html",
    "/api/auth/login",
    "/api/auth/register",
    "/api-docs",
  ];
  if (publicPaths.some((p) => req.path.startsWith(p))) return next();
  if (
    req.path.includes("/api-docs/") &&
    req.path.match(/\.(css|js|png|ico|map)$/)
  )
    return next();

  try {
    await connectDB();
    next();
  } catch (err) {
    res
      .status(503)
      .json({ error: true, message: "Database connection failed" });
  }
});

// ---------- API ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/dube", verifyToken, dubeRoutes);
app.use("/api/wfp", verifyToken, wfpRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/admin", verifyToken, adminRoutes);

// ---------- EXPORT & LOCAL SERVER ----------
module.exports = app;

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const PORT = process.env.PORT || 8000;
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
