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
   SWAGGER UI ROUTES WITH LOGOUT BUTTON - FIXED
========================================================= */

// Helper to set up each Swagger route with custom UI
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  // First, serve the Swagger UI interface
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

    // Get user info from token
    const userEmail = req.user.email || "User";
    const userRole = req.user.role || "user";
    const userName = userEmail.split("@")[0];
    const userInitials = userName
      .split(/[._-]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    // Store user data in res.locals for later injection
    res.locals.userData = {
      email: userEmail,
      role: userRole,
      name: userName,
      initials: userInitials,
    };

    // Get the original send function
    const originalSend = res.send;

    // Override send to inject our HTML
    res.send = function (body) {
      // Only modify HTML responses
      if (typeof body === "string" && body.includes("</body>")) {
        // Create the logout button HTML
        const logoutHtml = `
          <!-- User Info Badge -->
          <style>
            .user-info-badge {
              position: fixed;
              top: 20px;
              left: 20px;
              z-index: 9999;
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(8px);
              border-radius: 50px;
              padding: 8px 16px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              display: flex;
              align-items: center;
              gap: 10px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              border: 1px solid rgba(0, 0, 0, 0.05);
              animation: slideIn 0.3s ease-out;
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
              font-size: 14px;
            }
            
            .user-details {
              display: flex;
              flex-direction: column;
            }
            
            .user-name {
              font-weight: 600;
              font-size: 14px;
              color: #1e293b;
            }
            
            .user-role {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .logout-container {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 9999;
              animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
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
            
            .logout-btn:active {
              transform: translateY(0);
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
            
            .logout-text {
              position: relative;
              overflow: hidden;
            }
            
            .logout-text span {
              display: inline-block;
              transition: transform 0.2s ease;
            }
            
            .logout-btn:hover .logout-text span {
              transform: translateX(-4px);
            }
            
            .logout-text i {
              position: absolute;
              right: -20px;
              top: 50%;
              transform: translateY(-50%);
              opacity: 0;
              transition: all 0.2s ease;
              font-size: 12px;
              color: #dc2626;
            }
            
            .logout-btn:hover .logout-text i {
              right: -16px;
              opacity: 1;
            }
            
            .logout-btn.loading {
              pointer-events: none;
              opacity: 0.8;
            }
            
            .logout-btn.loading .logout-icon {
              animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            
            @media (max-width: 640px) {
              .user-info-badge {
                top: 16px;
                left: 16px;
                padding: 6px 12px;
              }
              
              .logout-container {
                top: 16px;
                right: 16px;
              }
              
              .logout-btn {
                padding: 8px 16px;
                font-size: 13px;
              }
              
              .user-avatar {
                width: 28px;
                height: 28px;
                font-size: 12px;
              }
            }
          </style>
          
          <div class="user-info-badge" id="userInfoBadge">
            <div class="user-avatar">${userInitials}</div>
            <div class="user-details">
              <span class="user-name">${userName}</span>
              <span class="user-role">${userRole.replace("-", " ")}</span>
            </div>
          </div>
          
          <div class="logout-container">
            <button class="logout-btn" id="swaggerLogoutBtn">
              <span class="logout-icon">
                <i class="fas fa-sign-out-alt"></i>
              </span>
              <span class="logout-text">
                <span>Sign Out</span>
                <i class="fas fa-arrow-right"></i>
              </span>
            </button>
          </div>
          
          <script>
            (function() {
              // Get the logout button
              const logoutBtn = document.getElementById('swaggerLogoutBtn');
              
              if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  console.log('🚪 Logging out...');
                  
                  this.classList.add('loading');
                  const icon = this.querySelector('.logout-icon i');
                  if (icon) {
                    icon.className = 'fas fa-circle-notch';
                  }
                  
                  // Clear all auth data
                  localStorage.removeItem('jwt-token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('refresh-token');
                  
                  // Redirect to login
                  setTimeout(() => {
                    window.location.href = '/login.html';
                  }, 800);
                });
              }
              
              // Add keyboard shortcut (Ctrl+Shift+L)
              document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                  e.preventDefault();
                  if (logoutBtn) logoutBtn.click();
                }
              });
              
              console.log('✅ Logout button initialized');
            })();
          </script>
        `;

        // Inject before closing body tag
        body = body.replace("</body>", logoutHtml + "</body>");
      }

      // Call original send
      return originalSend.call(this, body);
    };

    // Continue to Swagger UI setup
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
      customSiteTitle: `Dube API - ${userRole}`,
      customCss: ".swagger-ui .topbar { display: none; }",
    };

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
