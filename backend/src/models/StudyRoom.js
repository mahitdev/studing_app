const mongoose = require("mongoose");

const studyRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isPrivate: { type: Boolean, default: false },
    roomCode: { type: String, unique: true, sparse: true },
    activeSubject: { type: String, default: "General" },
    memberLimit: { type: Number, default: 10 },
    sharedGoal: { 
      title: { type: String, default: "Group Weekly Target" },
      targetMinutes: { type: Number, default: 600 },
      currentMinutes: { type: Number, default: 0 }
    },
    ambientSettings: {
      noiseLevel: { type: String, default: "medium" },
      theme: { type: String, default: "cyberpunk" }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyRoom", studyRoomSchema);
