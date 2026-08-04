# Deployment & Architecture

## Architecture

```
Vercel (Next.js)  ──HTTP──▶  Render (NestJS API :4000)  ──▶  Render Postgres
      │  └─ Socket.IO (realtime)                             ▲
      │                                                      │
      │  ──uploads──▶  Cloudflare R2 (public r2.dev)         │
      │                                                      │
   GitHub Actions ──▶ auto-deploy on push to main            │
                                                             │
                       Docker container also runs a bundled  │
                       Redis sidecar (entrypoint.sh) ─────────┘
```

## Components

### Frontend (Vercel)
- Next.js 14 App Router in `apps/web`
- Static + server-rendered pages, deployed to Vercel
- Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`

### API (Render web service, Docker)
- NestJS in `apps/api`, listens on `:4000` (0.0.0.0)
- Global prefix `/api/v1`
- Runs inside a Docker container that also starts a Redis sidecar (`entrypoint.sh`)
- Global JWT guard + Roles guard; public routes via `@Public()`
- File storage is pluggable: `local` or `r2` (S3-compatible)

### Database (Render Postgres)
- Free tier Postgres v18 (expires ~30 days after creation)
- Prisma schema pushed; seed script creates 8 users + ~526 tasks

### Cache (bundled Redis)
- Redis runs inside the API container on `127.0.0.1:6379`
- Falls back to in-memory if `REDIS_URL` is external/unreachable
- Cache is volatile (reset on redeploy) but eliminates cold-cache latency during runtime

### File storage (Cloudflare R2)
- S3-compatible; public via the r2.dev subdomain
- Persistent across API redeploys (unlike the container's ephemeral disk)

## Deployment flow

1. Push to `main` on GitHub
2. GitHub Action `.github/workflows/deploy-render.yml` POSTs to the Render API → triggers a deploy
3. Render builds the Docker image and rolls it out
4. Vercel auto-deploys `apps/web` (connected to the repo)

## Blueprint (`render.yaml`)

Defines both resources for reproducible deploys:

- Web service `creative-ops-erp-api` (Docker, free plan, Oregon)
- Database `creative-ops-erp-db` (free Postgres)

Env vars are either hardcoded (`CORS_ORIGIN`, storage config) or `sync: false` (secrets like `JWT_SECRET`, `DATABASE_URL` from the DB).

## Monitoring

`.github/workflows/uptime-monitor.yml` checks `GET /api/v1/health` every 5 minutes:

- Fails → opens a GitHub issue tagged `uptime`
- Recovers → auto-closes the issue

## Secrets & credentials

| Where | What |
|---|---|
| GitHub repo (secret) | `RENDER_API_KEY` |
| GitHub repo (var) | `RENDER_SERVICE_ID` |
| Render service env | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, S3 keys, `REDIS_URL` |
| Cloudflare R2 | S3 Access/Secret keys for the `creative-ops-erp` bucket |

Never commit real `.env` files — they are gitignored (`.env.example` files are committed).
