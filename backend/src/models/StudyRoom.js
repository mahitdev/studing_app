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
      theme: { type: String, default: "cyberpunk" },
      track: { type: String, default: "none" }
    },
    sharedNotes: { type: String, default: "" },
    replays: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudySession" }],
    groupStreak: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    activeVotes: {
      ambientTrack: {
        trackId: String,
        votes: [String] // array of user IDs
      }
    }
  },
  { timestamps: true }
);

studyRoomSchema.pre("save", function(next) {
  if (!this.roomCode) {
    this.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("StudyRoom", studyRoomSchema);
