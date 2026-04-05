import { Dashboard, LeaderboardEntry, LiveFriend, StudySession, User } from "./types";
import { mockRequest } from "./mockApi";

function normalizeApiBase(raw?: string) {
  const fallback = "http://localhost:5000/api";
  const value = (raw || fallback).trim();
  return value.replace(/\/+$/, "");
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      },
      cache: "no-store"
    });
  } catch {
    return mockRequest<T>(path, init);
  }

  if (res.status >= 500) {
    return mockRequest<T>(path, init);
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Request failed");
  }

  return res.json() as Promise<T>;
}

export async function bootstrapUser(
  name: string,
  college: string,
  identityType = "Serious",
  motivationWhy = ""
): Promise<{ user: User; dashboard: Dashboard }> {
  return request("/users/bootstrap", {
    method: "POST",
    body: JSON.stringify({ name, college, identityType, motivationWhy })
  });
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  college: string,
  identityType = "Serious",
  motivationWhy = ""
): Promise<{ user: User; token: string; dashboard: Dashboard }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, college, identityType, motivationWhy })
  });
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string; dashboard: Dashboard }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function fetchDashboard(userId: string): Promise<Dashboard> {
  return request(`/users/${userId}/dashboard`);
}

export async function setTodayGoal(userId: string, targetMinutes: number): Promise<{ dashboard: Dashboard }> {
  return request(`/users/${userId}/goals/today`, {
    method: "PUT",
    body: JSON.stringify({ targetMinutes })
  });
}

export async function setGoalConfig(
  userId: string,
  payload: { dailyMinutes?: number; weeklyTargetMinutes?: number; weeklySessionTarget?: number }
): Promise<{ dashboard: Dashboard }> {
  return request(`/users/${userId}/goals/config`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function setModes(
  userId: string,
  roastMode: boolean,
  identityType?: "Casual" | "Serious" | "Hardcore",
  motivationWhy?: string
): Promise<{ dashboard: Dashboard }> {
  return request(`/users/${userId}/modes`, {
    method: "PUT",
    body: JSON.stringify({ roastMode, identityType, motivationWhy })
  });
}

export async function startSession(userId: string, subject = "General"): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/start`, {
    method: "POST",
    body: JSON.stringify({ subject })
  });
}

export async function pauseSession(userId: string, sessionId: string, reason = "manual"): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/${sessionId}/pause`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function resumeSession(userId: string, sessionId: string): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/${sessionId}/resume`, {
    method: "POST"
  });
}

export async function endSession(
  userId: string,
  sessionId: string,
  inactiveSeconds: number,
  notes = "",
  subject = "",
  stopReason = "",
  antiCheatFlags = 0,
  sessionQualityTag: "deep" | "average" | "distracted" | "" = ""
): Promise<{ session: StudySession; dashboard: Dashboard }> {
  return request(`/users/${userId}/sessions/${sessionId}/end`, {
    method: "POST",
    body: JSON.stringify({ inactiveSeconds, notes, subject, stopReason, antiCheatFlags, sessionQualityTag })
  });
}

export async function resetSession(
  userId: string,
  sessionId: string,
  stopReason = ""
): Promise<{ session: StudySession; dashboard: Dashboard }> {
  return request(`/users/${userId}/sessions/${sessionId}/reset`, {
    method: "POST",
    body: JSON.stringify({ stopReason })
  });
}

export async function getTodaySessions(userId: string): Promise<{ sessions: StudySession[] }> {
  return request(`/users/${userId}/sessions/today`);
}

export async function getLeaderboard(college: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
  return request(`/leaderboard?college=${encodeURIComponent(college)}`);
}

export async function addFriend(
  userId: string,
  friendEmail: string
): Promise<{ friends: LiveFriend[] }> {
  return request(`/users/${userId}/friends/add`, {
    method: "POST",
    body: JSON.stringify({ friendEmail })
  });
}

export async function getLiveFriends(
  userId: string
): Promise<{ friends: LiveFriend[]; studyingNowCount: number; liveMessage: string }> {
  return request(`/users/${userId}/friends/live`);
}
