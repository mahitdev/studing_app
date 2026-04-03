export type User = {
  _id: string;
  name: string;
  college: string;
  email?: string;
  xp?: number;
  level?: number;
  badges?: string[];
};

export type DailyGoal = {
  _id: string;
  userId: string;
  date: string;
  targetMinutes: number;
  studiedMinutes: number;
  completionPercent: number;
  completed: boolean;
};

export type Dashboard = {
  todayGoal: DailyGoal;
  streak: {
    current: number;
    longest: number;
    missed: number;
  };
  punishmentActive: boolean;
  totals: {
    totalStudyHours: number;
    totalCompletedDays: number;
    totalMissedDays: number;
  };
  weekly: {
    weeklyTargetHours: number;
    weeklyStudyHours: number;
    weeklyWastedHours: number;
    weeklyCompletionPercent: number;
    completedDays: number;
  };
  history: Array<{
    date: string;
    studiedMinutes: number;
    targetMinutes: number;
    completionPercent: number;
    completed: boolean;
    intensity: number;
    color: string;
  }>;
  pulse: {
    score: number;
    level: string;
    avgFocusMinutes: number;
    avgInactiveMinutes: number;
  };
  complianceRate: number;
  focusScore: {
    score: number;
    label: string;
    message: string;
  };
  gamification: {
    xp: number;
    level: number;
    badges: string[];
    nextLevelXp: number;
  };
  challenges: Array<{
    id: string;
    title: string;
    target: number;
    value: number;
    completed: boolean;
    rewardXp: number;
    rewardBadge: string;
  }>;
  goalTypes: {
    dailyMinutes: number;
    weeklyTargetMinutes: number;
    weeklySessionTarget: number;
    todaySessionCount: number;
  };
  subjectTracking: {
    subjects: Array<{ subject: string; minutes: number; hours: number }>;
    weakAlerts: string[];
  };
  deepAnalytics: {
    bestStudyTime: string;
    averageSessionLength: number;
    trendDirection: string;
    weekendConsistency: string;
  };
  aiCoach: string[];
  roastMessage: string;
  aiSuggestions: string[];
  brutalMessage: string;
};

export type StudySession = {
  _id: string;
  status: "running" | "paused" | "completed";
  startedAt: string;
  endedAt?: string;
  focusedMinutes: number;
  pauseCount: number;
  inactiveSeconds: number;
  subject?: string;
  notes?: string;
  date: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  college: string;
  studiedMinutes: number;
  completionPercent: number;
  completed: boolean;
  level?: number;
  xp?: number;
};

export type LiveFriend = {
  userId: string;
  name: string;
  level: number;
  studyingNow: boolean;
};
