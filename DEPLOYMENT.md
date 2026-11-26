# YatraGuard Production Deployment Guide (GitHub + Neon + Render + Vercel)

## 1. Architecture Overview
- **Frontend (React + Vite):** Vercel (`client/` root directory, SPA rewrite in `client/vercel.json`)
- **Backend (Node.js + Express + Prisma):** Render (`render.yaml` Blueprint or `server/` root directory)
- **PostgreSQL Database:** Neon Cloud PostgreSQL (already synchronized with `server/prisma/schema.prisma`)
- **Media Storage:** Cloudinary (`CLOUDINARY_*` env vars). Without Cloudinary, uploads store locally under `/uploads` (ephemeral on Render free instances across restarts).

---

## 2. Step-by-Step Deployment Checklist

### Step A — Push Source Code to GitHub
Verify `.env` and `server/.env` remain untracked (`.gitignore` excludes `.env`, `.env.*`, `server/public/uploads/*`, and `server/private_vault/*`):
```bash
git status
git add .
git commit -m "Prepare YatraGuard for production deployment"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Step B — Deploy Backend on Render
1. In **Render Dashboard -> New -> Blueprint** (or **Web Service** linked to your GitHub repo):
   - **Root Directory:** `server`
   - **Build Command:** `npm ci && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm start`
   - **Health Check Path:** `/api/health`
2. Add Environment Variables on Render:
   - `NODE_ENV=production`
   - `DATABASE_URL` = *(copy from Neon PostgreSQL connection string)*
   - `JWT_SECRET` = *(generate via `openssl rand -base64 32` — required >= 16 chars in production)*
   - `FRONTEND_URL` = `https://<your-vercel-domain>.vercel.app`
   - `RESEND_API_KEY` & `EMAIL_FROM` = *(optional, for live password-reset email dispatch)*
   - `GEMINI_API_KEY` = *(optional, for live Gemini AI Travel Guardian)*
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` = *(Google OAuth 2.0 Web Client)*
   - `GOOGLE_MAPS_API_KEY` = *(optional, for Google Places New & Routes API; OSM/Overpass/OSRM fallback works automatically without it)*
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` = *(recommended for persistent profile & community uploads)*
   - `ALLOWED_ORIGINS` = `https://<your-vercel-domain>.vercel.app,http://localhost:3000` *(add Vercel URL right after Step C)*
   - `ALLOW_VERCEL_PREVIEWS=true`
3. Verify `https://<your-render-app>.onrender.com/api/health` returns `{ "status": "ok" }`.

### Step C — Deploy Frontend on Vercel
1. In **Vercel Dashboard -> Add New Project**, import your GitHub repository.
2. Configure **Project Settings**:
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add **Environment Variable** in Vercel:
   - `VITE_API_URL` = `https://<your-render-app>.onrender.com/api`
4. Deploy and copy your live Vercel URL (e.g. `https://yatraguard.vercel.app`).
5. Update Render's `ALLOWED_ORIGINS` to include `https://yatraguard.vercel.app` and redeploy/save env.

### Step D — Update Google Cloud Console OAuth Origins
1. Open **Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client ID**.
2. Add to **Authorized JavaScript origins**:
   - `https://<your-vercel-domain>.vercel.app`
   - `http://localhost:3000`
3. Save and allow 5 minutes for propagation.
