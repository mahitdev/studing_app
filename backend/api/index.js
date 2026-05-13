let app;
let connected = false;

module.exports = async (req, res) => {
  try {
    // 1. Lazy load app to catch initialization errors (like missing JWT_SECRET)
    if (!app) {
      app = require("../src/app");
    }

    const url = req.url || "";
    const isHealthRoute = url.startsWith("/api/health") || url === "/health";

    // 2. Connect to Database if not connected
    if (!connected && !isHealthRoute) {
      const connectDB = require("../src/config/db");
      await connectDB();
      connected = true;
    }

    // 3. Handle request
    return app(req, res);
  } catch (err) {
    console.error("Vercel Function Initialization Error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        code: "FUNCTION_INITIALIZATION_FAILED",
        message: "Neural link initialization failed. Likely missing Environment Variables.",
        error: err.message,
        hint: "Ensure JWT_SECRET and MONGODB_URI are configured in Vercel Dashboard."
      })
    );
  }
};
