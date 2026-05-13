const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String }, // Icon name or URL
  criteriaType: { 
    type: String, 
    enum: ["streak", "total_minutes", "pet_level", "deep_focus_count", "seasonal"],
    required: true 
  },
  criteriaValue: { type: Number, required: true },
  rewardXp: { type: Number, default: 100 },
  category: { type: String, default: "general" }, // general, seasonal, elite
  isSeasonal: { type: Boolean, default: false },
  expiryDate: { type: Date } // For seasonal events
}, { timestamps: true });

module.exports = mongoose.model("Achievement", achievementSchema);
