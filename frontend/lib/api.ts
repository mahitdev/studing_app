import { Dashboard, LeaderboardEntry, LiveFriend, StudySession, User } from "./types";
import { mockRequest } from "./mockApi";

const AUTH_TOKEN_KEY = "study-tracker-auth-token";
const USER_ID_KEY = "study-tracker-user-id";

// Use mock API whenever no explicit backend URL is configured.
// This makes the app work standalone (both locally and on Vercel) without a backend.
const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_API_URL) && typeof window !== "undefined" && localStorage.getItem("study-tracker-pref-mock") !== "true";

function normalizeApiBase(raw?: string) {
  const fallback = "http://localhost:5000/api";
  const value = (raw || fallback).trim();
  return value.replace(/\/+$/, "");
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function saveAuthSession(userId: string, token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!HAS_BACKEND) {
    return mockRequest<T>(path, init);
  }

  let res: Response | null = null;
  try {
    const fullUrl = `${API_BASE}${path}`.replace(/([^:]\/)\/+/g, "$1");
    res = await fetch(fullUrl, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        ...(init?.headers || {})
      },
      cache: "no-store"
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Connection to ${path} failed, attempting mock fallback:`, errorMsg);
    return mockRequest<T>(path, init);
  }

  if (!res) {
    return mockRequest<T>(path, init);
  }

  // Handle server-side errors gracefully by falling back to mock data
  if (res.status >= 500 || res.status === 404) {
    console.warn(`API Server Error ${res.status} for ${path}, using mock fallback.`);
    return mockRequest<T>(path, init);
  }

  if (!res.ok) {
    const errorText = await res.text();
    let message = "Request failed";
    try {
      const parsed = JSON.parse(errorText) as { message?: string };
      message = parsed.message || message;
    } catch {
      message = errorText || message;
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function bootstrapUser(
  name: string,
  college: string,
  identityType = "Serious",
  motivationWhy = ""
): Promise<{ user: User; token: string; dashboard: Dashboard }> {
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

export async function startSession(
  userId: string,
  subject = "General",
  studyMode: "pomodoro" | "deep" | "custom" = "custom",
  plannedDurationMinutes = 0,
  riskMode = false
): Promise<{ session: StudySession }> {
  return request(`/users/${userId}/sessions/start`, {
    method: "POST",
    body: JSON.stringify({ subject, studyMode, plannedDurationMinutes, riskMode })
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
  sessionQualityTag: "deep" | "average" | "distracted" | "" = "",
  studyMode: "pomodoro" | "deep" | "custom" = "custom",
  plannedDurationMinutes = 0,
  riskMode = false
): Promise<{ session: StudySession; dashboard: Dashboard }> {
  return request(`/users/${userId}/sessions/${sessionId}/end`, {
    method: "POST",
    body: JSON.stringify({
      inactiveSeconds,
      notes,
      subject,
      stopReason,
      antiCheatFlags,
      sessionQualityTag,
      studyMode,
      plannedDurationMinutes,
      riskMode
    })
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

export async function syncOfflineSessions(
  userId: string,
  sessions: Array<{
    startedAt: string;
    endedAt: string;
    focusedMinutes: number;
    inactiveSeconds?: number;
    pauseCount?: number;
    subject?: string;
    studyMode?: "pomodoro" | "deep" | "custom";
    plannedDurationMinutes?: number;
    riskMode?: boolean;
    notes?: string;
    stopReason?: string;
    sessionQualityTag?: "deep" | "average" | "distracted" | "";
    date?: string;
  }>
): Promise<{ synced: number; dashboard: Dashboard }> {
  return request(`/users/${userId}/sessions/offline-sync`, {
    method: "POST",
    body: JSON.stringify({ sessions })
  });
}

export async function subscribeWaitlist(
  email: string,
  source = "landing"
): Promise<{ ok: boolean; message: string }> {
  return request("/waitlist/subscribe", {
    method: "POST",
    body: JSON.stringify({ email, source })
  });
}

export async function sendProgressEmail(
  userId: string,
  email: string
): Promise<{ ok: boolean; message: string; summary?: { todayMinutes: number; weeklyHours: number; totalHours: number; completionRate: number } }> {
  return request(`/users/${userId}/email-summary`, {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function fetchAnalytics(userId: string): Promise<any> {
  return request(`/users/${userId}/analytics`);
}
