const app = require("../src/app");
const connectDB = require("../src/config/db");

let connected = false;

module.exports = async (req, res) => {
  const url = req.url || "";
  const isHealthRoute = url.startsWith("/api/health") || url === "/health";

  try {
    if (!connected && !isHealthRoute) {
      await connectDB();
      connected = true;
    }
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        code: "DB_CONNECT_FAILED",
        message: "Database connection failed. Check MONGODB_URI in backend env.",
        details: err.message
      })
    );
    return;
  }

  return app(req, res);
};
