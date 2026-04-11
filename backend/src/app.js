const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", routes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Server error", details: err.message });
});

module.exports = app;