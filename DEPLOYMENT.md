# Deployment Guide

## 1) Deploy Backend to Render
1. Go to `https://dashboard.render.com`.
2. Click **New +** -> **Blueprint**.
3. Connect repo: `mahitdev/studing_app`.
4. Render will detect `render.yaml` and create service `studing-app-backend`.
5. Set `MONGODB_URI` in Render env vars.
6. Deploy and copy backend URL (example: `https://studing-app-backend.onrender.com`).

Health check:
- `GET https://<your-backend>/api/health`

## 2) Deploy Frontend to Vercel
1. Go to `https://vercel.com/new`.
2. Import repo: `mahitdev/studing_app`.
3. Set **Root Directory** to `frontend`.
4. Add env var:
   - `NEXT_PUBLIC_API_URL=https://<your-backend>/api`
5. Deploy.

## 3) Verify End-to-End
- Open frontend URL.
- Start session.
- End session.
- Confirm dashboard updates and backend logs requests.

## Notes
- Backend CORS is currently open; tighten in production if needed.
- Update DNS/custom domain after first successful deploy.