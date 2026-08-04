# Creative Operations ERP

A full-stack ERP for creative agencies — manage tasks, projects, clients, and employees with realtime updates, KPIs, and reports.

- **Frontend:** Next.js 14 (App Router) — `apps/web`
- **Backend:** NestJS REST API + Socket.IO realtime — `apps/api`
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (bundled in the Docker container on Render free tier)
- **File storage:** Cloudflare R2 (S3-compatible, persistent)

## Live demo

| Component | URL |
|---|---|
| Web app | https://web-pi-rose-49.vercel.app |
| API | https://creative-ops-erp-api.onrender.com |
| Health check | https://creative-ops-erp-api.onrender.com/api/v1/health |

### Demo logins

| Role | Email | Password | Portal |
|---|---|---|---|
| Manager (admin) | `admin@onedot.com` | `Admin@123` | `MANAGER` |
| Employee | `sneha@onedot.com` | `Pass@123` | `EMPLOYEE` |

More seeded employees: `sathiya@`, `robin@`, `priya@`, `karthik@`, `meera@`, `arjun@` (all `@onedot.com`, password `Pass@123`).

## Tech stack

- **Monorepo:** npm workspaces (`apps/api`, `apps/web`)
- **API:** NestJS, Prisma, Socket.IO, JWT auth (access + refresh), role-based access control (MANAGER / EMPLOYEE)
- **Web:** Next.js 14, Tailwind CSS, react-query, socket.io-client
- **Deployment:** Render (API + Postgres), Vercel (web), Cloudflare R2 (files), GitHub Actions (auto-deploy)

## Getting started

### Prerequisites

- Node.js >= 20
- Docker (for local Postgres + Redis)

### 1. Install

```bash
npm install
```

### 2. Local database

```bash
npm run db:up        # starts Postgres + Redis via docker compose
npm run db:generate  # generates Prisma client
npm run db:push      # applies schema
npm run db:seed      # seeds 8 users + demo data
```

### 3. Configure env vars

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Set a `JWT_SECRET` and `JWT_REFRESH_SECRET` in `apps/api/.env`, then in `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 4. Run

```bash
npm run dev          # API on :4000 + web on :3000
```

## API overview

See the full [API reference](docs/api-reference.md) and [deployment guide](docs/deployment.md).

All routes are prefixed with `/api/v1` and require a `Bearer` token except `auth/login`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Dashboard | `GET /dashboard/summary`, `/ranking`, `/growth`, `/trend`, `/departments` |
| Tasks | `GET /tasks`, `/tasks/kanban`, `/tasks/my-day`, `/tasks/calendar`, `/tasks/overdue`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id/status`, `POST /tasks/:id/reassign`, `POST /tasks/:id/comments` |
| Reports | `GET /reports/tasks`, `/reports/employees`, `/reports/kpi` (MANAGER only) |
| Users | `GET /users` (MANAGER only) |
| Clients | `GET/POST /clients`, stakeholder management |
| Calendar | `GET /calendar/holidays`, `/calendar/leaves` |
| Files | `POST /files/upload` |
| Misc | `GET /activity`, `/notifications`, `/settings`, `/settings/kpi`, `/ai/summary` |
| Health | `GET /health` (public) |

Login expects `{ email, password, portal }` where `portal` is `MANAGER` or `EMPLOYEE`.

## Realtime events (Socket.IO)

The web app connects to `NEXT_PUBLIC_SOCKET_URL` and receives events in realtime:

- `task.created`, `task.updated`, `task.assigned`, `task.commented`
- `client.created`, `stakeholder.changed`
- `notification`

## Storage

Set `STORAGE_DRIVER=local` for disk storage, or `r2` for Cloudflare R2 (persistent, survives redeploys):

```
STORAGE_DRIVER=r2
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...
S3_PUBLIC_URL=https://pub-<bucket-id>.r2.dev
```

## Deployment

### Render (API + Postgres)

`render.yaml` describes the stack (blueprint). The API runs in Docker with a bundled Redis sidecar (`entrypoint.sh`), connected to a managed Postgres. Pushes to `main` auto-deploy via the GitHub Action in `.github/workflows/deploy-render.yml` (uses `RENDER_API_KEY` and `RENDER_SERVICE_ID` secrets).

### Vercel (web)

From `apps/web`:

```bash
vercel --prod
```

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to the Render API URL in production.

## Project structure

```
apps/
  api/       NestJS REST API + Socket.IO + Prisma
  web/       Next.js frontend
.github/
  workflows/ GitHub Action for Render auto-deploy
entrypoint.sh   Starts bundled Redis, then the API (Docker)
render.yaml     Render blueprint (API + Postgres)
```
