const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    status: {
      type: String,
      enum: ["running", "paused", "completed"],
      default: "running"
    },
    pauseCount: { type: Number, default: 0 },
    pauses: [
      {
        startedAt: { type: Date, required: true },
        endedAt: { type: Date },
        reason: { type: String, default: "manual" }
      }
    ],
    focusedMinutes: { type: Number, min: 0, default: 0 },
    inactiveSeconds: { type: Number, min: 0, default: 0 },
    subject: { type: String, default: "General" },
    notes: { type: String, default: "" },
    stopReason: { type: String, default: "" },
    antiCheatFlags: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudySession", studySessionSchema);
