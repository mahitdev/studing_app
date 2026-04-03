const mongoose = require("mongoose");

const dailyGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    targetMinutes: { type: Number, required: true, min: 0, default: 180 },
    studiedMinutes: { type: Number, required: true, min: 0, default: 0 },
    completionPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

dailyGoalSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyGoal", dailyGoalSchema);