const User = require("../models/User");
const Challenge = require("../models/Challenge");
const StudySession = require("../models/StudySession");
const logger = require("../utils/logger");

async function ensureDailyChallenges(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const deadline = new Date();
  deadline.setHours(23, 59, 59, 999);

  const existing = await Challenge.find({ 
    userId, 
    type: "daily",
    createdAt: { $gte: new Date(today) }
  });

  if (existing.length === 0) {
    const dailyChallenges = [
      {
        userId,
        type: "daily",
        title: "Deep Focus Initializer",
        description: "Complete 1 deep focus session (50 mins)",
        targetValue: 1,
        rewardXp: 100,
        deadline
      },
      {
        userId,
        type: "daily",
        title: "Discipline Marathon",
        description: "Study for a total of 180 minutes today",
        targetValue: 180,
        rewardXp: 200,
        deadline
      }
    ];
    await Challenge.insertMany(dailyChallenges);
    logger.info(`Generated daily challenges for user ${userId}`);
  }
}

async function updateChallengeProgress(userId, type, value) {
  const challenges = await Challenge.find({ userId, type, isCompleted: false });
  
  for (const challenge of challenges) {
    challenge.currentValue += value;
    if (challenge.currentValue >= challenge.targetValue) {
      challenge.isCompleted = true;
      challenge.completedAt = new Date();
      
      // Reward user
      const user = await User.findById(userId);
      if (user) {
        user.xp += challenge.rewardXp;
        // Simple level up logic
        const nextLevelXp = user.level * 1000;
        if (user.xp >= nextLevelXp) {
          user.level += 1;
          user.badges.push(`Level ${user.level} Operative`);
        }
        if (challenge.rewardBadge && !user.badges.includes(challenge.rewardBadge)) {
          user.badges.push(challenge.rewardBadge);
        }
        await user.save();
        logger.info(`User ${userId} completed challenge: ${challenge.title}. Rewarded ${challenge.rewardXp} XP.`);
      }
    }
    await challenge.save();
  }
}

async function updateStreak(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const user = await User.findById(userId);
  if (!user) return;

  if (user.streak.lastActivityDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (user.streak.lastActivityDate === yesterdayStr) {
    user.streak.current += 1;
  } else {
    user.streak.current = 1;
  }

  if (user.streak.current > user.streak.longest) {
    user.streak.longest = user.streak.current;
  }

  user.streak.lastActivityDate = today;
  
  user.pet.happiness = Math.min(100, user.pet.happiness + 10);
  
  await user.save();
  logger.info(`Updated streak for user ${userId}: ${user.streak.current} days.`);
}

module.exports = {
  ensureDailyChallenges,
  updateChallengeProgress,
  updateStreak
};
