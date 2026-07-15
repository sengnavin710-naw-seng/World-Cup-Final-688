# Configuration

English | [ภาษาไทย](../th/CONFIGURATION.md)

## Environment files

| Context | File | Purpose |
|---|---|---|
| Local API development | `apps/api/.env` | Read by the API process when the workspace script runs |
| Local web development | `apps/web/.env` | Read by Vite at startup/build time |
| Docker Compose | `.env` | Injected into the API service and used for Compose substitutions |
| Template | `.env.example` | Variable names only; never put real secrets here |

Restart the relevant process after changing an environment file. `VITE_*` values are build-time values and require rebuilding the web assets/image.

## API variables

| Variable | Required | Secret | Default / behavior |
|---|---:|---:|---|
| `PORT` | No | No | `3001` |
| `SUPABASE_URL` | For persistent selections | No | Empty enables in-memory fallback |
| `SUPABASE_SECRET_KEY` | For persistent selections | Yes | Preferred server key name |
| `SUPABASE_SERVICE_ROLE_KEY` | Alternative | Yes | Used when `SUPABASE_SECRET_KEY` is absent |
| `FOOTBALL_API_BASE_URL` | No | No | `https://v3.football.api-sports.io` |
| `FOOTBALL_API_KEY` | For live tournament data | Yes | Missing key enables static fallback |
| `FOOTBALL_WORLD_CUP_LEAGUE_ID` | For live tournament data | No | No implicit league ID |
| `FOOTBALL_WORLD_CUP_SEASON` | No | No | `2026` |
| `FOOTBALL_API_CACHE_TTL_MS` | No | No | Fixture cache: `15000` milliseconds |
| `FOOTBALL_API_STANDINGS_CACHE_TTL_MS` | No | No | Standings cache: `300000` milliseconds |
| `CORS_EXTRA_ORIGINS` | No | No | Comma-separated additional browser origins |

`SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` grant server-side access and must never be sent to the browser.

Example `apps/api/.env`:

```env
PORT=3001
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_KEY
FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io
FOOTBALL_API_KEY=YOUR_API_KEY
FOOTBALL_WORLD_CUP_LEAGUE_ID=1
FOOTBALL_WORLD_CUP_SEASON=2026
FOOTBALL_API_CACHE_TTL_MS=15000
FOOTBALL_API_STANDINGS_CACHE_TTL_MS=300000
CORS_EXTRA_ORIGINS=
```

## Web variables

| Variable | Required | Default / behavior |
|---|---:|---|
| `VITE_API_BASE_URL` | No | Empty means same-origin requests such as `/api/...` |
| `VITE_BRAND_NAME` | No | `World Cup Festival 688` |

Example `apps/web/.env` for direct local API access:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_BRAND_NAME=World Cup Festival 688
```

Production Docker builds deliberately set `VITE_API_BASE_URL` to an empty string. The browser calls the same origin and Nginx proxies `/api/` to the API service.

## Compose-only variables

| Variable | Default | Purpose |
|---|---|---|
| `WEB_BIND_ADDRESS` | `127.0.0.1` | Host interface that publishes the web container |
| `WEB_PORT` | `8088` | Host port mapped to Nginx port 80 |

Use `WEB_BIND_ADDRESS=0.0.0.0` only when the container must be reachable directly from other machines. On a VPS with a host reverse proxy, keep `127.0.0.1`.

## Security rules

- `.env` and workspace-specific `.env` files must remain outside Git.
- Never put server secrets in `VITE_*` variables; they are visible in browser JavaScript.
- Keep production secrets on the VPS or in a dedicated secret manager.
- Rotate a key immediately if it appears in a commit, screenshot, terminal transcript, or frontend bundle.
