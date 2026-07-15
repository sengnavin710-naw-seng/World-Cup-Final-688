# Development

English | [ภาษาไทย](../th/DEVELOPMENT.md)

## Prerequisites

- Node.js 22 recommended
- npm 10 or newer
- A Supabase project for persistent shared selections
- An API-Football key for live fixtures and standings
- Docker Desktop only when testing the production container setup

## Install

From the repository root:

```powershell
npm ci
```

Use `npm install` when intentionally changing dependencies. Commit both `package.json` and `package-lock.json` when dependency versions change.

## Configure

Create these untracked files:

- `apps/api/.env` for the local API process
- `apps/web/.env` for Vite

Use `.env.example` as the variable checklist and read [Configuration](CONFIGURATION.md) before adding secrets.

To prepare Supabase, run the migrations in filename order:

```text
supabase/migrations/20260530_create_selection_records.sql
supabase/migrations/20260530_enable_rls_for_participant_selections.sql
```

The server key is used only by the API. The browser does not connect directly to the protected table.

## Run locally

Terminal 1 — API:

```powershell
npm run dev:api
```

Verify:

```text
http://localhost:3001/health
```

Terminal 2 — Web:

```powershell
npm run dev:web
```

Open:

```text
http://localhost:5173
```

The Vite development server proxies `/api` to `http://localhost:3001`. Setting `VITE_API_BASE_URL=http://localhost:3001` bypasses that proxy and requires the API CORS allow-list to accept the web origin.

## Test from another device

Run Vite on all interfaces:

```powershell
npm run dev:host
```

Find the computer's private IPv4 address with `ipconfig`, then open `http://YOUR_IP:5173` on a device connected to the same trusted network.

For the simplest phone setup, leave `VITE_API_BASE_URL` empty so requests use the Vite `/api` proxy. If the firewall prompts for access, allow Node.js only on trusted private networks.

The computer and phone must use the same Wi-Fi. Disable mobile data or a VPN temporarily if it sends the phone through a different network. Re-run `ipconfig` after changing Wi-Fi because the computer's IPv4 address can change.

### Windows Firewall

If the phone cannot connect, open PowerShell as Administrator and allow only the Vite port on trusted Private networks and the local subnet:

```powershell
$port = 5173
$ruleName = "World Cup Festival 688 Vite $port Private LAN"
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private -RemoteAddress LocalSubnet
```

Remove the rule when it is no longer needed:

```powershell
Remove-NetFirewallRule -DisplayName $ruleName
```

Do not create this inbound rule for public Wi-Fi.

### When port 5173 is already in use

Inspect the listeners before stopping anything:

```powershell
Get-NetTCPConnection -LocalPort 3001,5173,5174 -State Listen
```

Docker can also own a port through its port proxy:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Do not stop an unknown process or container. Either stop the known old development server with `Ctrl + C`, or start this project's web workspace on another port:

```powershell
npm run dev --workspace web -- --host 0.0.0.0 --port 5174
```

Use `http://YOUR_IP:5174` on the phone and set `$port = 5174` when creating its Private-LAN firewall rule.

Verify that the selected port serves this project rather than another Vite application:

```powershell
(Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing).Content
```

The returned HTML should contain `<title>World Cup Festival 688</title>`.

## Workspace commands

| Command | Purpose |
|---|---|
| `npm run dev:web` | Start the local Vite server |
| `npm run dev:host` | Start Vite on `0.0.0.0:5173` |
| `npm run dev:api` | Start the API with file watching |
| `npm run lint` | Type-check both workspaces |
| `npm test` | Run all Vitest suites |
| `npm run build` | Build both workspaces |

Workspace-specific commands use `--workspace web` or `--workspace api`, for example:

```powershell
npm test --workspace api
npm run build --workspace web
```

## Project layout

```text
apps/api/src/data/       Static tournament data
apps/api/src/routes/     Express route handlers
apps/api/src/services/   Business logic and external providers
apps/web/src/components/ UI and tab modules
apps/web/src/hooks/      Session, query, gesture, and notification hooks
apps/web/src/lib/        API client, types, identity, and query helpers
supabase/migrations/     Database schema and access-control migrations
```

## Common problems

- API not reachable: confirm `npm run dev:api` is running and verify it with `Invoke-RestMethod http://localhost:3001/health`.
- Empty persistent selections: confirm the Supabase URL/key and migration state. Without them the API intentionally uses memory.
- Phone opens the UI but API fails: use an empty `VITE_API_BASE_URL` with `dev:host`, or configure a reachable API origin and `CORS_EXTRA_ORIGINS`.
- Phone cannot open the UI: confirm the current IPv4 address, the Vite port, the Private-LAN firewall rule, and that both devices use the same trusted Wi-Fi.
- Port already in use: identify the owning process or Docker container first; stop it only when it belongs to this project, otherwise use an alternate port.
- Changes are not visible: restart Vite after environment changes; rebuild after dependency or production-image changes.

Stop a foreground development server from its terminal with `Ctrl + C`.
