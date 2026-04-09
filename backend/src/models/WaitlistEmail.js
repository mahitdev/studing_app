const mongoose = require("mongoose");

const waitlistEmailSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: "landing" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("WaitlistEmail", waitlistEmailSchema);
