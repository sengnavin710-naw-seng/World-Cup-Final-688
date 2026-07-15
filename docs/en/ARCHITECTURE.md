# Architecture

English | [ภาษาไทย](../th/ARCHITECTURE.md)

## System overview

```text
Browser
  |
  v
React/Vite web
  |
  | HTTP /api/*
  v
Express API
  |-- Supabase Cloud (participant selections)
  |-- API-Football (fixtures and standings)
  `-- RSS feed (news)
```

In production, Nginx serves the built React files and proxies `/api/*` to the API container. Docker exposes the web container on `127.0.0.1:8088` by default; the API remains on the internal Compose network at port `3001`.

## Web application

`apps/web` owns presentation and browser state.

- `App.tsx` chooses between session loading, team selection, and the Home View.
- `useParticipantSession` reconciles local storage with the API session.
- TanStack Query loads tournament and participant data.
- Home tab modules are lazy-loaded for Knockout, Fixtures, Table, and News.
- `src/lib/api.ts` is the active HTTP client contract.

The web application must never receive Supabase server keys or external API secrets. Values prefixed with `VITE_` are compiled into browser assets.

## API application

`apps/api` owns validation, selection rules, external data access, and persistence.

- `server.ts` configures CORS, JSON parsing, request IDs, logging, routes, 404 responses, and centralized error handling.
- `selectionService.ts` coordinates Supabase, in-memory fallback data, team ownership, and tournament data.
- `apiFootballService.ts` fetches and caches live fixtures/standings.
- `knockoutProjectionService.ts` projects knockout rounds from standings and results.
- `rssService.ts` fetches and caches news for 15 minutes.

## Data and fallback behavior

- Participant selections persist in Supabase when `SUPABASE_URL` and a server key are configured.
- Missing Supabase configuration activates an in-memory selection store intended for development only.
- Missing or unusable API-Football configuration falls back to static fixtures and standings.
- Knockout projection falls back to static knockout data when live fixture requests fail.
- RSS failures return an empty news list.

## Containers

| Service | Runtime | Responsibility |
|---|---|---|
| `web` | Nginx Alpine | Serve React assets, SPA fallback, `/api` proxy, health endpoint |
| `api` | Node.js 22 Alpine | Run the bundled Express API |

Both images use multi-stage builds. The web build output and API bundle are copied into smaller runtime stages.

## Current notification boundary

The repository contains push-notification and WebSocket client/service scaffolding, and Nginx reserves `/ws`. The active Express server currently mounts only health, tournament, and participant routers; push routes and a WebSocket upgrade server are not active. Treat notifications as incomplete until those server integrations are implemented and tested.
