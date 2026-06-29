# ⚽ World Cup Festival 688

A real-time World Cup 2026 fantasy tournament web app.  
Participants pick a national team, track fixtures, knockout brackets, standings, and news.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend API | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL) |
| Live Fixtures | API-Football (api-sports.io) |
| Process Manager | PM2 |
| Web Server | Nginx |

---

## Project Structure

```
/
├── apps/
│   ├── api/          # Express API server (Node.js)
│   │   └── src/
│   │       ├── data/         # Static team & allocation data
│   │       ├── routes/       # API route handlers
│   │       ├── services/     # Business logic (fixtures, knockout, etc.)
│   │       └── index.ts      # Entry point
│   └── web/          # React frontend (Vite)
│       └── src/
│           ├── components/   # UI components
│           ├── hooks/        # Custom React hooks
│           └── lib/          # API client & utilities
├── supabase/         # Database schema & migrations
├── .env.example      # Environment variable template
└── package.json      # Root workspace config
```

---

## Prerequisites

- **Node.js** v20 LTS — https://nodejs.org
- **npm** v10+
- **Supabase** account — https://supabase.com (free tier is fine)
- **API-Football** key — https://www.api-football.com (free: 100 req/day)

---

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment files

**`apps/api/.env`** (copy from `.env.example` and fill in your values):
```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io
FOOTBALL_API_KEY=your_football_api_key
FOOTBALL_WORLD_CUP_LEAGUE_ID=1
FOOTBALL_WORLD_CUP_SEASON=2026
FOOTBALL_API_CACHE_TTL_MS=60000
CORS_EXTRA_ORIGINS=
```

**`apps/web/.env`**:
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_BRAND_NAME=World Cup Festival 688
```

### 3. Set up Supabase database

Run the SQL schema from `supabase/` folder in your Supabase project's SQL editor.

### 4. Start development servers

```bash
# Terminal 1 — API server
npm run dev --workspace=apps/api

# Terminal 2 — Web frontend
npm run dev --workspace=apps/web
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api/health

---

## Production Deployment (VPS / Ubuntu 22.04)

### Build

```bash
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

### Start API with PM2

```bash
pm2 start apps/api/dist/index.js --name wcf688-api
pm2 save
```

### Nginx config

Point Nginx root to `apps/web/dist/` and proxy `/api/` to `http://localhost:3001`.

### Update deployment

```bash
git pull origin main
npm run build --workspace=apps/api
npm run build --workspace=apps/web
pm2 restart wcf688-api
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/tournament` | All fixtures, teams, standings |
| GET | `/api/teams` | Available teams |
| POST | `/api/select-team` | Register device + pick team |
| PATCH | `/api/display-name` | Update display name |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | API server port (default: 3001) |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (admin) |
| `FOOTBALL_API_KEY` | ✅ | API-Football key |
| `FOOTBALL_WORLD_CUP_LEAGUE_ID` | ✅ | League ID (World Cup 2026 = 1) |
| `FOOTBALL_WORLD_CUP_SEASON` | ✅ | Season year (2026) |
| `FOOTBALL_API_CACHE_TTL_MS` | ❌ | Cache duration ms (default: 60000) |
| `CORS_EXTRA_ORIGINS` | ❌ | Extra allowed CORS origins |
| `VITE_API_BASE_URL` | ✅ (web) | API URL used by frontend |
| `VITE_BRAND_NAME` | ❌ | App title shown in UI |
