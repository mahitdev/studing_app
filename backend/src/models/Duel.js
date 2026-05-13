const mongoose = require("mongoose");

const duelSchema = new mongoose.Schema(
  {
    challengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    opponentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "active", "completed", "rejected"], default: "pending" },
    durationMinutes: { type: Number, default: 30 },
    challengerProgress: { type: Number, default: 0 },
    opponentProgress: { type: Number, default: 0 },
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    xpPrize: { type: Number, default: 100, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Duel", duelSchema);
