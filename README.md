# World Cup Festival 688

English | [ภาษาไทย](README.th.md)

World Cup Festival 688 is a responsive World Cup 2026 companion app. A participant chooses one national team, returns on the same browser through a device identity, and follows fixtures, standings, knockout projections, team ownership, and news.

## Stack

| Layer | Technology |
|---|---|
| Web | React 19, TypeScript, Vite, TanStack Query |
| API | Node.js, Express, TypeScript |
| Data | Supabase PostgreSQL with an in-memory development fallback |
| Tournament feeds | API-Football and RSS |
| Production | Docker Compose and Nginx |

## Quick start

Requirements: Node.js 22 and npm 10 or newer.

```bash
npm install
npm run dev:api
```

In a second terminal:

```bash
npm run dev:web
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:3001/health`.

Create `apps/api/.env` and `apps/web/.env` before local development. See [Configuration](docs/en/CONFIGURATION.md) for the required values.

## Docker

```bash
docker compose up -d --build
docker compose ps
```

Open `http://localhost:8088`. Stop the stack with `docker compose down`.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Documentation

| Topic | English | ภาษาไทย |
|---|---|---|
| Development | [Development](docs/en/DEVELOPMENT.md) | [การพัฒนา](docs/th/DEVELOPMENT.md) |
| Architecture | [Architecture](docs/en/ARCHITECTURE.md) | [สถาปัตยกรรม](docs/th/ARCHITECTURE.md) |
| Domain | [Domain](docs/en/DOMAIN.md) | [คำศัพท์และกฎระบบ](docs/th/DOMAIN.md) |
| Configuration | [Configuration](docs/en/CONFIGURATION.md) | [การตั้งค่า](docs/th/CONFIGURATION.md) |
| API | [API](docs/en/API.md) | [API](docs/th/API.md) |
| Deployment | [Deployment](docs/en/DEPLOYMENT.md) | [การติดตั้งใช้งาน](docs/th/DEPLOYMENT.md) |
| Operations | [Operations](docs/en/OPERATIONS.md) | [การดูแลระบบ](docs/th/OPERATIONS.md) |
| Testing | [Testing](docs/en/TESTING.md) | [การทดสอบ](docs/th/TESTING.md) |

## Repository layout

```text
apps/web/             React frontend
apps/api/             Express API
supabase/migrations/  Database migrations
docs/en/              English documentation
docs/th/              Thai documentation
Dockerfile.web        Web production image
Dockerfile.api        API production image
docker-compose.yml    Local/VPS container stack
nginx.conf            Static hosting and API proxy
```

Never commit `.env` files or expose server-side keys through a `VITE_*` variable.
