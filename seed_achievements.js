const mongoose = require("mongoose");
const Achievement = require("./backend/src/models/Achievement");
require("dotenv").config();

const achievements = [
  {
    title: "Neural Initiate",
    description: "Start your first study session",
    criteriaType: "total_minutes",
    criteriaValue: 1,
    icon: "Zap",
    rewardXp: 50,
    category: "general"
  },
  {
    title: "Focused Operative",
    description: "Complete a 7-day study streak",
    criteriaType: "streak",
    criteriaValue: 7,
    icon: "Flame",
    rewardXp: 300,
    category: "milestone"
  },
  {
    title: "Deep Diver",
    description: "Study for 500 total minutes",
    criteriaType: "total_minutes",
    criteriaValue: 500,
    icon: "Target",
    rewardXp: 500,
    category: "milestone"
  },
  {
    title: "Pet Whisperer",
    description: "Reach pet level 5",
    criteriaType: "pet_level",
    criteriaValue: 5,
    icon: "Shield",
    rewardXp: 250,
    category: "pet"
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Achievement.deleteMany({});
  await Achievement.insertMany(achievements);
  console.log("Seed complete");
  process.exit();
}

seed();
