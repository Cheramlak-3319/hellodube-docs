const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const { verifyToken, extractToken } = require("./middleware/auth");
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

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Load OpenAPI files
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

// ========== PROFESSIONAL LOGOUT BUTTON MIDDLEWARE ==========
app.use((req, res, next) => {
  // Only intercept Swagger UI HTML responses
  if (
    req.path.includes("/api-docs/") &&
    !req.path.match(/\.(css|js|png|ico|map)$/)
  ) {
    const originalSend = res.send;

    res.send = function (body) {
      if (typeof body === "string" && body.includes("</body>")) {
        // Professional logout button HTML/CSS with modern design
        const logoutHtml = `
          <!-- Font Awesome for icons (if not already loaded) -->
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          
          <style>
            /* Professional Logout Button Styles */
            .logout-container {
              position: fixed;
              top: 24px;
              right: 24px;
              z-index: 10000;
              animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
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
              background: white;
              border-color: #dc2626;
            }
            
            .logout-btn:active {
              transform: translateY(0);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
            
            /* Loading state */
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
            
            /* User badge (optional - shows current user) */
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
            
            .user-badge i {
              color: #2a7f62;
              font-size: 14px;
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
            
            /* Responsive adjustments */
            @media (max-width: 640px) {
              .logout-container {
                top: 16px;
                right: 16px;
              }
              
              .user-badge {
                top: 16px;
                left: 16px;
                font-size: 12px;
                padding: 6px 12px;
              }
              
              .logout-btn {
                padding: 8px 16px;
                font-size: 13px;
              }
            }
          </style>
          
          <div class="user-badge" id="userBadge">
            <i class="fas fa-user-circle"></i>
            <span id="userName">Loading...</span>
            <span class="user-role" id="userRole"></span>
          </div>
          
          <div class="logout-container">
            <button class="logout-btn" id="logoutBtn">
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
              'use strict';
              
              // Get user data from localStorage
              function getUserData() {
                try {
                  const token = localStorage.getItem('jwt-token');
                  const userStr = localStorage.getItem('user');
                  
                  if (userStr) {
                    return JSON.parse(userStr);
                  }
                  
                  // If no user object but token exists, decode it
                  if (token) {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(atob(base64));
                    return {
                      name: payload.email || 'User',
                      role: payload.role || 'user'
                    };
                  }
                  
                  return null;
                } catch (e) {
                  console.warn('Failed to parse user data:', e);
                  return null;
                }
              }
              
              // Update UI with user data
              function updateUserInfo() {
                const user = getUserData();
                const userNameEl = document.getElementById('userName');
                const userRoleEl = document.getElementById('userRole');
                
                if (user) {
                  if (userNameEl) {
                    const displayName = user.name || user.email || 'User';
                    userNameEl.textContent = displayName.split('@')[0];
                  }
                  if (userRoleEl && user.role) {
                    userRoleEl.textContent = user.role.replace('-', ' ');
                  }
                }
              }
              
              // Handle logout with animation
              function handleLogout() {
                const btn = document.getElementById('logoutBtn');
                if (!btn) return;
                
                btn.classList.add('loading');
                
                // Clear all auth data
                localStorage.removeItem('jwt-token');
                localStorage.removeItem('user');
                localStorage.removeItem('refresh-token');
                
                // Update button text
                const icon = btn.querySelector('.logout-icon i');
                if (icon) {
                  icon.className = 'fas fa-circle-notch';
                }
                
                // Redirect after animation
                setTimeout(() => {
                  window.location.href = '/login.html';
                }, 800);
              }
              
              // Initialize when DOM is ready
              function init() {
                updateUserInfo();
                
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                  logoutBtn.addEventListener('click', handleLogout);
                }
                
                // Also add keyboard shortcut (Ctrl+Shift+L)
                document.addEventListener('keydown', (e) => {
                  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                    e.preventDefault();
                    handleLogout();
                  }
                });
              }
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
              } else {
                init();
              }
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

// ========== SWAGGER UI ROUTES ==========
const setupSwaggerRoute = (routePath, swaggerDoc, allowedRoles) => {
  // Serve static assets
  app.use(routePath, swaggerUi.serve);

  // Main page with authentication
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

    // Serve Swagger UI with minimal options - logout handled by middleware
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
      customSiteTitle: "Dube API Docs",
    })(req, res, next);
  });
};

// Set up all four routes
setupSwaggerRoute("/api-docs/dube/admin", dubeFull, ["dube-admin"]);
setupSwaggerRoute("/api-docs/dube/viewer", dubeReadOnly, ["dube-viewer"]);
setupSwaggerRoute("/api-docs/wfp/admin", wfpFull, ["wfp-admin"]);
setupSwaggerRoute("/api-docs/wfp/viewer", wfpReadOnly, ["wfp-viewer"]);

// ---------- API ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/dube", verifyToken, dubeRoutes);
app.use("/api/wfp", verifyToken, wfpRoutes);

// ========== MONGODB CONNECTION ==========
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
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .then((mongoose) => {
        console.log("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
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

// Database middleware
app.use(async (req, res, next) => {
  const publicPaths = [
    "/login.html",
    "/api/auth/login",
    "/api/auth/register",
    "/api/test/public",
    "/health",
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
