const jwt = require("jsonwebtoken");

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: true, message: "Authentication required." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: "Access denied. Insufficient permissions.",
      });
    }
    next();
  };
};

const extractToken = (req) => {
  // 1. Try Authorization header
  const authHeader = req.header("Authorization");
  if (authHeader) {
    let token = authHeader.replace(/^Bearer\s+/i, "").trim();
    while (token.toLowerCase().startsWith("bearer ")) {
      token = token.slice(7).trim();
    }
    return token;
  }

  // 2. Try query parameter 'token'
  if (req.query.token) {
    return req.query.token.trim();
  }

  return null;
};

// ✅ Update verifyToken to use extractToken
const verifyToken = (req, res, next) => {
  const publicPaths = [
    "/api/auth",
    "/login.html",
    "/health",
    "/api/test/public",
  ];
  if (publicPaths.some((path) => req.path.startsWith(path))) return next();

  const token = extractToken(req); // 👈 now works with both header and query
  if (!token) {
    return res
      .status(401)
      .json({ error: true, message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔍 Token from URL:", req.query.token);
    console.log("🔍 Extracted token:", token);
    console.log(
      "🔍 JWT_SECRET (Swagger):",
      process.env.JWT_SECRET ? "✅ Loaded" : "❌ UNDEFINED",
    );
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: true, message: "Invalid or expired token." });
  }
};

// ... rest of your code (checkRole)
module.exports = { verifyToken, checkRole, extractToken };

module.exports = { verifyToken, checkRole, extractToken };
