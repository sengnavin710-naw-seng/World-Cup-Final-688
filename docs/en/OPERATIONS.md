# Operations

English | [ภาษาไทย](../th/OPERATIONS.md)

This runbook assumes the Docker Compose deployment described in [Deployment](DEPLOYMENT.md).

## Daily status

```bash
docker compose ps
docker compose logs --tail 100
curl -fsS http://127.0.0.1:8088/healthz
```

Healthy operation means:

- `api` and `web` are running and healthy.
- `/healthz` returns `ok`.
- `/api/tournament/teams` returns JSON.
- The public HTTPS URL loads without certificate errors.

## Logs

```bash
docker compose logs -f
docker compose logs -f api
docker compose logs -f web
docker compose logs --since 30m api
```

Press `Ctrl+C` to stop following logs; containers continue running. API responses include `x-request-id`, which can be matched with API log lines.

## Restart and rebuild

```bash
# Restart without rebuilding
docker compose restart
docker compose restart api

# Reconcile configuration
docker compose up -d

# Rebuild after code or dependency changes
docker compose up -d --build

# Stop and remove this stack's containers/network
docker compose down
```

`docker compose down` does not delete Supabase Cloud data or the local images.

## Incident checklist

1. Check `docker compose ps` for stopped, unhealthy, or restarting containers.
2. Read the last 100–200 lines from the failing service.
3. Test `/healthz` and a proxied `/api` endpoint from the VPS itself.
4. Confirm disk, memory, DNS, and outbound connectivity.
5. Confirm production environment variables exist without printing secret values into a shared log.
6. Restart only the failing service when configuration has not changed.
7. Roll back if the incident began immediately after deployment.

## Common failures

### Web container is healthy but the public site is unavailable

- Check host Nginx status and configuration.
- Confirm it proxies to `127.0.0.1:8088`.
- Check the firewall and TLS certificate.
- Test `curl -I http://127.0.0.1:8088/` directly on the VPS.

### Web loads but API requests fail

- Check `docker compose logs api` and API health.
- Confirm the web container can resolve the Compose service name `api`.
- Check Supabase and external-provider configuration.
- Use the response `requestId` to find the matching error log.

### Selections disappear after restart

The API is using the in-memory fallback. Configure `SUPABASE_URL` and one valid server key, then confirm the `participant_selections` table and migrations exist.

### Fixtures or standings show static data

Verify `FOOTBALL_API_KEY`, league ID, season, provider quota, and outbound network access. Static fallback is intentional when live data is unavailable.

### News is empty

The RSS provider may be unreachable or may have changed its feed. The service intentionally returns an empty list on feed errors.

## Resources and disk

```bash
docker stats
docker system df
docker image ls
```

Remove unused images only after confirming they are not required for rollback. Avoid broad prune commands during an incident.

## Data protection

- Supabase stores the persistent application records; configure its backup/recovery policy separately from Docker.
- Preserve the VPS `.env` securely, but do not place it in Git or ordinary backups without encryption.
- Apply database migrations deliberately and back up before destructive schema changes.
- Docker containers themselves are disposable and should not be treated as backups.

## Post-deployment verification

- Both containers are healthy.
- Team list and participant session APIs work.
- A test selection can be created, changed, and reset when production testing is authorized.
- Fixtures, standings, knockout, and news render.
- Mobile and desktop layouts load.
- Host HTTPS and certificate renewal are healthy.
