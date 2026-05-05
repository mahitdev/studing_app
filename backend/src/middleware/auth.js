const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-local-secret-only");

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL CONFIG ERROR: JWT_SECRET must be defined in production.");
}

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireSelf = (req, res, next) => {
  if (String(req.auth?.sub || "") !== String(req.params.userId || "")) {
    return res.status(403).json({ message: "Forbidden: user mismatch" });
  }
  return next();
};

module.exports = { requireAuth, requireSelf, JWT_SECRET };
