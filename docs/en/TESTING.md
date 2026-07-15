# Testing

English | [ภาษาไทย](../th/TESTING.md)

The repository uses Vitest for API and web tests. Web tests run with jsdom and Testing Library; API tests run in the Node environment.

## Full verification

Run from the repository root:

```powershell
npm run lint
npm test
npm run build
docker compose build
```

| Command | What it verifies |
|---|---|
| `npm run lint` | TypeScript checks for both workspaces |
| `npm test` | All API and web tests |
| `npm run build` | Production compilation for both workspaces |
| `docker compose build` | Container build files and production packaging |

## Workspace tests

```powershell
npm test --workspace api
npm test --workspace web
npm run lint --workspace api
npm run lint --workspace web
```

Run a focused Vitest file by passing its path after `--`:

```powershell
npm test --workspace api -- src/routes/participant.test.ts
npm test --workspace web -- src/lib/deviceIdentity.test.ts
```

## Current automated coverage areas

API tests cover participant routes, tournament routes, API-Football mapping/cache behavior, and knockout projection. Web tests cover device identity, query behavior, selection UI, layouts, tab loading/error states, swipe behavior, fixtures, knockout, and table presentation.

Automated tests do not replace live-provider, Supabase permission, browser, mobile-device, Docker networking, or VPS HTTPS verification.

## Manual smoke test

1. Open the app with a clean browser profile.
2. Search for and select an available team with a Display Name.
3. Refresh and confirm the Participant is restored.
4. Check Knockout, Fixtures, Table, and News tabs.
5. Change the team and confirm the old team becomes available.
6. Reset the device and confirm the selection is released.
7. Try selecting the same team from two browser profiles and confirm the second request receives a conflict.
8. Check narrow mobile and desktop widths.

## Docker smoke test

```powershell
docker compose up -d --build
docker compose ps
```

Verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8088/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8088/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8088/api/tournament/teams
```

Then stop the test stack:

```powershell
docker compose down
```

## Before merging or deploying

- Review the diff and ensure unrelated local changes are excluded.
- Confirm no `.env`, keys, logs, or generated build output are staged.
- Run the full verification commands.
- Review database migrations separately.
- Update both English and Thai documents when behavior or commands change.
- Perform the post-deployment checks in [Operations](OPERATIONS.md).
