# Deployment

English | [ภาษาไทย](../th/DEPLOYMENT.md)

Docker Compose is the supported production packaging for this repository. It runs two services:

```text
Host Nginx / HTTPS (optional but recommended on VPS)
  -> 127.0.0.1:8088
  -> web container (Nginx + React)
  -> api container (Node.js :3001, internal only)
  -> Supabase Cloud / API-Football / RSS
```

## Prerequisites

- Docker Engine with the Compose plugin
- Repository checkout on the target host
- A production `.env` at the repository root
- A configured Supabase project with both migrations applied
- A host reverse proxy and TLS certificate for public HTTPS

PM2 is not required when the API runs in Docker. Compose owns process restarts through `restart: unless-stopped`.

## Production environment

Create `.env` at the repository root. At minimum, review:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
FOOTBALL_API_KEY=
FOOTBALL_WORLD_CUP_LEAGUE_ID=1
FOOTBALL_WORLD_CUP_SEASON=2026
WEB_BIND_ADDRESS=127.0.0.1
WEB_PORT=8088
```

Do not copy a development `.env` over an existing production file. See [Configuration](CONFIGURATION.md).

## First deployment

```bash
cd /var/www/World-Cup-Final-688
docker compose build
docker compose up -d
docker compose ps
```

Expected state: both `api` and `web` are `Up` and healthy.

Verify from the host:

```bash
curl -fsS http://127.0.0.1:8088/healthz
curl -I http://127.0.0.1:8088/
curl -fsS http://127.0.0.1:8088/api/tournament/teams
```

## Host Nginx

Keep the container bound to `127.0.0.1:8088` and terminate public HTTPS in the host Nginx. A minimal proxy location is:

```nginx
location / {
    proxy_pass http://127.0.0.1:8088;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Validate host Nginx configuration before reloading it. Certificate issuance and renewal remain host responsibilities.

## Update deployment

1. Confirm the current containers are healthy and record the deployed commit.
2. Back up or verify Supabase recovery before applying schema changes.
3. Pull the intended code revision.
4. Preserve the production `.env`.
5. Build and reconcile the stack.

```bash
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail 100
```

Run the verification requests again after every deployment.

## Rollback principle

Keep a known-good Git revision and the previous images until verification finishes. If a release fails, redeploy the known-good revision and rebuild, or deploy explicitly versioned images from a registry. Do not use `git reset --hard` on a VPS with unreviewed local changes.

For repeatable rollbacks, the next maturity step is CI that tags both images with the Git commit SHA and publishes them to a private registry.

## Container build design

- `Dockerfile.web` builds React with Node.js and copies only `dist` into Nginx.
- `Dockerfile.api` builds the API bundle, installs production dependencies, and runs as the non-root `node` user.
- `.dockerignore` excludes `.env`, Git data, dependencies, logs, build output, and documentation.
- Nginx proxies `/api/`, reserves `/ws`, applies SPA fallback, and avoids long-term caching for `index.html` and `sw.js`.

## Exposing the container directly

For a trusted LAN test only, set:

```env
WEB_BIND_ADDRESS=0.0.0.0
WEB_PORT=8088
```

Do not use direct HTTP exposure as the final public production configuration. Use a firewall and HTTPS reverse proxy.
