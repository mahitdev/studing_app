const mongoose = require("mongoose");

const studyGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  activeChallenges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Challenge" }],
  sharedGoals: [{
    title: { type: String },
    targetMinutes: { type: Number },
    currentMinutes: { type: Number, default: 0 }
  }],
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowMemberInvites: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model("StudyGroup", studyGroupSchema);
