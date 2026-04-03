"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addFriend,
  bootstrapUser,
  endSession,
  fetchDashboard,
  getLiveFriends,
  getTodaySessions,
  loginUser,
  pauseSession,
  registerUser,
  resetSession,
  resumeSession,
  setGoalConfig,
  setModes,
  startSession
} from "../lib/api";
import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";

type Screen = "dashboard" | "timer" | "analytics" | "streak" | "settings";
type AuthMode = "quick" | "register" | "login";

type AppSettings = {
  preferredStudyTime: string;
  punishmentMode: boolean;
  darkMode: boolean;
  notifications: boolean;
  streakProtectionWeek: string;
  streakProtectionUsed: boolean;
  roastMode: boolean;
};

const DEFAULT_NAME = "Focused Student";
const DEFAULT_COLLEGE = "General";
const DEFAULT_SETTINGS: AppSettings = {
  preferredStudyTime: "20:00",
  punishmentMode: true,
  darkMode: false,
  notifications: false,
  streakProtectionWeek: "",
  streakProtectionUsed: false,
  roastMode: true
};

function formatHMS(seconds: number) {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${sec}`;
}

function weekKey(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return `${date.getFullYear()}-W${Math.ceil((day + start.getDay() + 1) / 7)}`;
}

function compactDate(dateKey: string) {
  const d = new Date(dateKey);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function StudyTrackerApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("quick");
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [liveFriends, setLiveFriends] = useState<LiveFriend[]>([]);
  const [liveMessage, setLiveMessage] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [inactiveSeconds, setInactiveSeconds] = useState(0);
  const [subject, setSubject] = useState("General");
  const [notes, setNotes] = useState("");
  const [timerAlert, setTimerAlert] = useState("");
  const [goalDaily, setGoalDaily] = useState(180);
  const [goalWeekly, setGoalWeekly] = useState(1200);
  const [goalSessions, setGoalSessions] = useState(7);
  const [nameInput, setNameInput] = useState(DEFAULT_NAME);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  const hiddenAt = useRef<number | null>(null);

  const userKey = useMemo(() => "study-tracker-user-id", []);
  const settingsKey = useMemo(() => "study-tracker-settings", []);

  const refreshAll = async (userId: string) => {
    const [dash, todaySessions, live] = await Promise.all([
      fetchDashboard(userId),
      getTodaySessions(userId),
      getLiveFriends(userId).catch(() => ({ friends: [], studyingNowCount: 0, liveMessage: "" }))
    ]);

    setDashboard(dash);
    setGoalDaily(dash.goalTypes.dailyMinutes);
    setGoalWeekly(dash.goalTypes.weeklyTargetMinutes);
    setGoalSessions(dash.goalTypes.weeklySessionTarget);
    setSessions(todaySessions.sessions);
    setLiveFriends(live.friends || []);
    setLiveMessage(live.liveMessage || "");

    const running = todaySessions.sessions.find((s) => s.status === "running" || s.status === "paused") || null;
    setActiveSession(running);
    if (running?.subject) setSubject(running.subject);
  };

  useEffect(() => {
    const rawSettings = localStorage.getItem(settingsKey);
    if (rawSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }

    const init = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem(userKey);

        if (!userId) {
          setOnboardingOpen(true);
          setLoading(false);
          return;
        }

        const pseudoUser = { _id: userId, name: DEFAULT_NAME, college: DEFAULT_COLLEGE };
        setUser(pseudoUser);
        await refreshAll(userId);
      } catch (err) {
        setError((err as Error).message || "Failed to initialize app");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [settingsKey, userKey]);

  useEffect(() => {
    document.body.dataset.theme = settings.darkMode ? "dark" : "light";
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings, settingsKey]);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const started = new Date(activeSession.startedAt).getTime();
    const tick = () => {
      if (activeSession.status !== "running") return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    const onVisibility = async () => {
      if (!activeSession || !user) return;

      if (document.hidden && activeSession.status === "running") {
        hiddenAt.current = Date.now();
        try {
          const { session } = await pauseSession(user._id, activeSession._id, "tab-switch");
          setActiveSession(session);
          setTimerAlert("Focus bro... you switched tabs 👀");
        } catch {
          setTimerAlert("Session lost focus. Resume manually.");
        }
      }

      if (!document.hidden && hiddenAt.current) {
        const delta = Math.round((Date.now() - hiddenAt.current) / 1000);
        setInactiveSeconds((prev) => prev + Math.max(0, delta));
        hiddenAt.current = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [activeSession, user]);

  useEffect(() => {
    if (!settings.notifications || !user || !dashboard) return;

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const timer = setInterval(() => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const studied = dashboard.todayGoal.studiedMinutes;
      const target = dashboard.todayGoal.targetMinutes;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [prefH, prefM] = settings.preferredStudyTime.split(":").map(Number);
      const preferredMinutes = (prefH * 60) + prefM;

      if (studied === 0 && currentMinutes >= preferredMinutes) {
        new Notification("You haven't studied today");
      }

      const remaining = target - studied;
      if (remaining > 0 && remaining <= 60 && now.getHours() >= 20) {
        new Notification("1 hour left to complete goal");
      }
    }, 1800000);

    return () => clearInterval(timer);
  }, [settings.notifications, settings.preferredStudyTime, user, dashboard]);

  const saveSettings = (next: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
  };

  const submitOnboarding = async () => {
    try {
      setError("");
      let response;

      if (authMode === "quick") {
        response = await bootstrapUser(nameInput, DEFAULT_COLLEGE);
      } else if (authMode === "register") {
        response = await registerUser(nameInput, emailInput, passwordInput, DEFAULT_COLLEGE);
      } else {
        response = await loginUser(emailInput, passwordInput);
      }

      localStorage.setItem(userKey, response.user._id);
      setUser(response.user);
      await setGoalConfig(response.user._id, {
        dailyMinutes: goalDaily,
        weeklyTargetMinutes: goalWeekly,
        weeklySessionTarget: goalSessions
      });
      await refreshAll(response.user._id);
      setOnboardingOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleGoalUpdate = async () => {
    if (!user) return;
    const { dashboard: updated } = await setGoalConfig(user._id, {
      dailyMinutes: goalDaily,
      weeklyTargetMinutes: goalWeekly,
      weeklySessionTarget: goalSessions
    });
    setDashboard(updated);
  };

  const handleStart = async () => {
    if (!user) return;

    try {
      setError("");
      const { session } = await startSession(user._id, subject);
      setActiveSession(session);
      setInactiveSeconds(0);
      setTimerAlert("");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePauseResume = async () => {
    if (!user || !activeSession) return;

    try {
      if (activeSession.status === "running") {
        const { session } = await pauseSession(user._id, activeSession._id, "manual");
        setActiveSession(session);
      } else {
        const { session } = await resumeSession(user._id, activeSession._id);
        setActiveSession(session);
        setTimerAlert("");
      }
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEnd = async () => {
    if (!user || !activeSession) return;

    try {
      const { dashboard: updated } = await endSession(user._id, activeSession._id, inactiveSeconds, notes, subject);
      setDashboard(updated);
      setActiveSession(null);
      setInactiveSeconds(0);
      setNotes("");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReset = async () => {
    if (!user || !activeSession) return;

    try {
      const { dashboard: updated } = await resetSession(user._id, activeSession._id);
      setDashboard(updated);
      setActiveSession(null);
      setElapsedSeconds(0);
      setInactiveSeconds(0);
      setNotes("");
      setTimerAlert("Timer reset.");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const useStreakProtection = () => {
    const currentWeek = weekKey();
    if (settings.streakProtectionWeek === currentWeek && settings.streakProtectionUsed) return;
    saveSettings({ streakProtectionWeek: currentWeek, streakProtectionUsed: true });
  };

  const handleAddFriend = async () => {
    if (!user || !friendEmail.trim()) return;
    try {
      await addFriend(user._id, friendEmail.trim());
      setFriendEmail("");
      await refreshAll(user._id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRoastMode = async (enabled: boolean) => {
    if (!user) return;
    saveSettings({ roastMode: enabled });
    try {
      const { dashboard: updated } = await setModes(user._id, enabled);
      setDashboard(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <main className="shell">Loading...</main>;

  if (onboardingOpen) {
    return (
      <main className="shell onboarding-screen">
        <section className="card onboarding">
          <h1>Set Your Discipline Baseline</h1>
          <p>Quick setup: goals + preferred time, then start.</p>

          <div className="row wrap">
            <button className={authMode === "quick" ? "nav-btn active" : "nav-btn"} onClick={() => setAuthMode("quick")}>Quick Start</button>
            <button className={authMode === "register" ? "nav-btn active" : "nav-btn"} onClick={() => setAuthMode("register")}>Register</button>
            <button className={authMode === "login" ? "nav-btn active" : "nav-btn"} onClick={() => setAuthMode("login")}>Login</button>
          </div>

          {authMode !== "login" && (
            <label>Name
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            </label>
          )}
          {authMode !== "quick" && (
            <>
              <label>Email
                <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
              </label>
              <label>Password
                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
              </label>
            </>
          )}

          <label>Daily goal (minutes)
            <input type="number" min={30} max={960} value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
          </label>
          <label>Preferred study time
            <input type="time" value={settings.preferredStudyTime} onChange={(e) => saveSettings({ preferredStudyTime: e.target.value })} />
          </label>
          <button onClick={submitOnboarding}>{authMode === "login" ? "Login & Sync" : "Start Tracking"}</button>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  if (!dashboard || !user) return <main className="shell">Unable to load data. {error}</main>;

  const punishmentActive = settings.punishmentMode && dashboard.punishmentActive;
  const progressPercent = dashboard.todayGoal.completionPercent;
  const timerProgress = Math.min(100, Math.round((elapsedSeconds / Math.max(1, dashboard.todayGoal.targetMinutes * 60)) * 100));
  const streakProtectedThisWeek = settings.streakProtectionWeek === weekKey() && settings.streakProtectionUsed;
  const nav: Array<{ id: Screen; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "timer", label: "Study Timer" },
    { id: "analytics", label: "Analytics" },
    { id: "streak", label: "Streak" },
    { id: "settings", label: "Settings" }
  ];

  return (
    <main className={`shell ${punishmentActive ? "punishment-screen" : ""}`}>
      <header className="top-nav card">
        <h1>Study Tracker</h1>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={screen === item.id ? "nav-btn active" : "nav-btn"} onClick={() => setScreen(item.id)}>{item.label}</button>
          ))}
        </nav>
      </header>

      {punishmentActive && (
        <section className="card punish-banner">
          <strong>You failed today.</strong>
          <p>Goal missed. Streak pressure is active.</p>
          {settings.roastMode && dashboard.roastMessage && <p className="timer-alert">{dashboard.roastMessage}</p>}
        </section>
      )}

      {screen === "dashboard" && (
        <section className="card page">
          <h2>Dashboard</h2>
          <div className="kpi-grid">
            <article><p>Today's Goal</p><h3>{dashboard.todayGoal.targetMinutes} min</h3></article>
            <article><p>Studied Today</p><h3>{dashboard.todayGoal.studiedMinutes} min</h3></article>
            <article><p>Current Streak</p><h3>{dashboard.streak.current} days</h3></article>
            <article><p>Focus Score</p><h3>{dashboard.focusScore.score}%</h3><small>{dashboard.focusScore.label}</small></article>
            <article><p>XP</p><h3>{dashboard.gamification.xp}</h3></article>
            <article><p>Level</p><h3>{dashboard.gamification.level}/50</h3></article>
          </div>
          <p className="motivation">{dashboard.focusScore.message}</p>
          <div className="progress-wrap">
            <div className="progress"><span style={{ width: `${progressPercent}%` }} /></div>
            <p>{progressPercent}% complete</p>
          </div>

          <div className="row wrap">
            <input placeholder="Add friend by email" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} />
            <button onClick={handleAddFriend}>Add Friend</button>
          </div>
          <p className="muted">{liveMessage || "No friends live right now"}</p>
          <p className="muted">{liveFriends.filter((f) => f.studyingNow).length} people studying now</p>
          {liveFriends.length > 0 && (
            <ul className="stats">
              {liveFriends.map((f) => (
                <li key={f.userId}>{f.name} • L{f.level} • {f.studyingNow ? "Studying now" : "Offline"}</li>
              ))}
            </ul>
          )}

          <button onClick={() => setScreen("timer")}>Start Study</button>
        </section>
      )}

      {screen === "timer" && (
        <section className="card page">
          <h2>Study Timer</h2>
          <div className="timer-center">
            <div className="timer-ring big" style={{ ["--ring-fill" as string]: `${timerProgress}%` }}>
              <span>{formatHMS(elapsedSeconds)}</span>
            </div>
          </div>
          <div className="grid two">
            <div>
              <label>Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option>General</option>
                <option>Math</option>
                <option>Science</option>
                <option>DSA</option>
                <option>Programming</option>
                <option>Language</option>
              </select>
            </div>
            <div>
              <label>Session notes</label>
              <textarea rows={3} value={notes} placeholder="What are you covering this session?" onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {timerAlert && <p className="timer-alert">{timerAlert}</p>}
          <p className="muted">Inactive deduction: {Math.round(inactiveSeconds / 60)} min</p>
          <div className="row wrap">
            <button onClick={handleStart} disabled={Boolean(activeSession)}>Start</button>
            <button onClick={handlePauseResume} disabled={!activeSession}>{activeSession?.status === "paused" ? "Resume" : "Pause"}</button>
            <button onClick={handleReset} disabled={!activeSession}>Reset</button>
            <button onClick={handleEnd} disabled={!activeSession}>Finish</button>
          </div>
        </section>
      )}

      {screen === "analytics" && (
        <section className="card page">
          <h2>Analytics</h2>
          <p className="muted">Smart calendar heatmap (GitHub style)</p>
          <div className="calendar-grid">
            {dashboard.history.slice(-56).map((day) => (
              <span key={day.date} className={`heat ${day.color}`} title={`${day.date}: ${day.studiedMinutes} min`} />
            ))}
          </div>

          <div className="trend-grid">
            {dashboard.history.slice(-14).map((day) => (
              <div key={day.date} className="trend-col" title={`${day.studiedMinutes} min`}>
                <div className={day.completed ? "target-bar ok" : "target-bar bad"}>
                  <span style={{ height: `${Math.min(100, day.completionPercent)}%` }} />
                </div>
                <p>{compactDate(day.date)}</p>
              </div>
            ))}
          </div>

          <div className="kpi-grid analytics-kpis">
            <article><p>Total Hours</p><h3>{dashboard.totals.totalStudyHours}h</h3></article>
            <article><p>Best Study Time</p><h3>{dashboard.deepAnalytics.bestStudyTime}</h3></article>
            <article><p>Avg Session</p><h3>{dashboard.deepAnalytics.averageSessionLength} min</h3></article>
            <article><p>Trend</p><h3>{dashboard.deepAnalytics.trendDirection}</h3></article>
            <article className="missed"><p>Missed Goals</p><h3>{dashboard.streak.missed}</h3></article>
          </div>

          <h3>Subject Tracking</h3>
          <ul className="stats">
            {dashboard.subjectTracking.subjects.map((s) => (
              <li key={s.subject}>{s.subject}: {s.hours}h</li>
            ))}
          </ul>
          {dashboard.subjectTracking.weakAlerts.length > 0 && (
            <p className="timer-alert">Weak alert: {dashboard.subjectTracking.weakAlerts[0]}</p>
          )}
        </section>
      )}

      {screen === "streak" && (
        <section className="card page">
          <h2>Streak & Motivation</h2>
          <div className="kpi-grid">
            <article><p>Current</p><h3>{dashboard.streak.current} days</h3></article>
            <article><p>Longest</p><h3>{dashboard.streak.longest} days</h3></article>
            <article><p>Badges</p><h3>{dashboard.gamification.badges.length}</h3></article>
          </div>

          <div className="badges">
            {dashboard.gamification.badges.length === 0 && <span className="badge">No badges yet</span>}
            {dashboard.gamification.badges.map((b) => <span key={b} className="badge unlocked">{b}</span>)}
          </div>

          <p className="motivation">
            {dashboard.streak.current > 0
              ? `${dashboard.streak.current} days strong. Don't mess it up.`
              : "You broke your streak. Start again."}
          </p>

          <h3>Weekly Challenges</h3>
          <div className="stats">
            {dashboard.challenges.map((c) => (
              <p key={c.id}>
                {c.title}: {c.value}/{c.target} {c.completed ? "(Completed)" : "(In progress)"}
              </p>
            ))}
          </div>

          <h3>AI Coach</h3>
          <ul className="stats">
            {dashboard.aiCoach.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>

          <div className="streak-protection">
            <p>Streak protection (once/week): {streakProtectedThisWeek ? "Used" : "Available"}</p>
            <button onClick={useStreakProtection} disabled={streakProtectedThisWeek}>Use Protection</button>
          </div>
        </section>
      )}

      {screen === "settings" && (
        <section className="card page">
          <h2>Settings</h2>
          <div className="settings-grid">
            <label>
              Daily goal (minutes)
              <input type="number" min={30} max={960} value={goalDaily} onChange={(e) => setGoalDaily(Number(e.target.value))} />
            </label>
            <label>
              Weekly target (minutes)
              <input type="number" min={60} max={6000} value={goalWeekly} onChange={(e) => setGoalWeekly(Number(e.target.value))} />
            </label>
            <label>
              Weekly session target
              <input type="number" min={1} max={50} value={goalSessions} onChange={(e) => setGoalSessions(Number(e.target.value))} />
            </label>
            <button onClick={handleGoalUpdate}>Apply Goal Types</button>
            <label className="toggle-row">Enable punishment mode
              <input type="checkbox" checked={settings.punishmentMode} onChange={(e) => saveSettings({ punishmentMode: e.target.checked })} />
            </label>
            <label className="toggle-row">Dark mode
              <input type="checkbox" checked={settings.darkMode} onChange={(e) => saveSettings({ darkMode: e.target.checked })} />
            </label>
            <label className="toggle-row">Notifications
              <input type="checkbox" checked={settings.notifications} onChange={(e) => saveSettings({ notifications: e.target.checked })} />
            </label>
            <label className="toggle-row">Roast mode
              <input type="checkbox" checked={settings.roastMode} onChange={(e) => handleRoastMode(e.target.checked)} />
            </label>
            <label>
              Preferred study time
              <input type="time" value={settings.preferredStudyTime} onChange={(e) => saveSettings({ preferredStudyTime: e.target.value })} />
            </label>
          </div>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
