# Study Tracker

A discipline-first study tracker for students.

## Stack
- Frontend: Next.js (App Router)
- Backend: Node.js + Express
- Database: MongoDB Atlas (Mongoose)
- Deploy: Vercel (frontend), Render (backend)

## Core Features (MVP)
- Daily study goals with completion percentage
- Smart study timer with pause tracking and inactive tab deduction
- Streak engine with reset-on-miss behavior
- Brutal reality dashboard (wasted hours, weekly completion, missed days)
- Punishment mode banner when discipline slips
- College leaderboard
- AI-style focus suggestions from session patterns

## Project Structure
- `frontend/` Next.js app
- `backend/` Express API

## Backend Setup
1. Open `backend/.env.example` and create `backend/.env`.
2. Add your MongoDB Atlas connection string.
3. Run:

```bash
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

## Frontend Setup
1. Copy `frontend/.env.local.example` to `frontend/.env.local`.
2. Ensure backend URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Run:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

## API Highlights
- `POST /api/users/bootstrap`
- `PUT /api/users/:userId/goals/today`
- `GET /api/users/:userId/dashboard`
- `POST /api/users/:userId/sessions/start`
- `POST /api/users/:userId/sessions/:sessionId/pause`
- `POST /api/users/:userId/sessions/:sessionId/resume`
- `POST /api/users/:userId/sessions/:sessionId/end`
- `GET /api/users/:userId/sessions/today`
- `GET /api/leaderboard?college=General&limit=10`

## Deploy Notes
- Render: deploy `backend`, set `MONGODB_URI`, `PORT`.
- Vercel: deploy `frontend`, set `NEXT_PUBLIC_API_URL` to your Render API URL + `/api`.

## Next Extensions
- Block distracting sites/apps during active sessions
- Friend invite + private leaderboards
- Hard punishment mode (lock analytics until target is hit)