import { Dashboard, LiveFriend, StudySession, User } from "../lib/types";

export type Screen = "dashboard" | "timer" | "analytics" | "streak" | "settings" | "colosseum";

export interface AppState {
  screen: Screen;
  user: User | null;
  dashboard: Dashboard | null;
  sessions: StudySession[];
  activeSession: StudySession | null;
  elapsed: number;
  status: "idle" | "running" | "paused";
  error: string | null;
  isActionLoading: boolean;
  // ... more states can be added
}

export type Action =
  | { type: "SET_SCREEN"; payload: Screen }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_DASHBOARD"; payload: Dashboard | null }
  | { type: "SET_SESSIONS"; payload: StudySession[] }
  | { type: "SET_ACTIVE_SESSION"; payload: StudySession | null }
  | { type: "SET_ELAPSED"; payload: number }
  | { type: "SET_STATUS"; payload: "idle" | "running" | "paused" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean };

export const initialState: AppState = {
  screen: "dashboard",
  user: null,
  dashboard: null,
  sessions: [],
  activeSession: null,
  elapsed: 0,
  status: "idle",
  error: null,
  isActionLoading: false,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_SCREEN": return { ...state, screen: action.payload };
    case "SET_USER": return { ...state, user: action.payload };
    case "SET_DASHBOARD": return { ...state, dashboard: action.payload };
    case "SET_SESSIONS": return { ...state, sessions: action.payload };
    case "SET_ACTIVE_SESSION": return { ...state, activeSession: action.payload };
    case "SET_ELAPSED": return { ...state, elapsed: action.payload };
    case "SET_STATUS": return { ...state, status: action.payload };
    case "SET_ERROR": return { ...state, error: action.payload };
    case "SET_LOADING": return { ...state, isActionLoading: action.payload };
    default: return state;
  }
}
