# Creative Operations ERP

A premium SaaS-grade Creative Operations ERP for marketing agencies — inspired by Linear, Notion, Stripe, Vercel, Framer, Arc Browser and ClickUp. Track creative productivity, daily tasks, stakeholder assignments, client management and KPI analytics.

## Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, shadcn-style UI, Framer Motion, GSAP, Recharts, TanStack Table, React Flow (xyflow)
- **Backend**: NestJS, Prisma ORM, PostgreSQL, Redis, Socket.IO, JWT + refresh tokens, RBAC
- **Storage**: PostgreSQL + optional Cloudflare R2 / AWS S3

## Project layout

```
creative-ops-erp/
├── docker-compose.yml      # PostgreSQL + Redis
├── apps/
│   ├── api/                 # NestJS backend (port 4000)
│   └── web/                  # Next.js frontend (port 3000)
```

## Getting started

### 1. Infrastructure (PostgreSQL + Redis)

Install [Docker](https://docker.com) then:

```bash
npm run db:up         # docker compose up -d
```

> No Docker? Install PostgreSQL 16 + Redis locally and point `DATABASE_URL` and `REDIS_URL` in `apps/api/.env`.

### 2. Configure environment

```bash
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.local.example apps\web\.env.local
```

Edit the secrets in `apps/api/.env` (JWT secrets, database URL).

### 3. Install dependencies & prepare the database

```bash
npm install
npm run db:generate          # prisma generate
npm run db:push              # push schema to DB
npm run db:seed              # seed demo data (admin + employees + clients + tasks)
```

### 4. Run

```bash
npm run dev                  # API on :4000, Web on :3000
```

Open http://localhost:3000

## Demo accounts (from seed)

| Role      | Email                 | Password   |
|-----------|-----------------------|------------|
| Manager   | `admin@onedot.com`    | `Admin@123`|
| Employee  | `sneha@onedot.com`    | `Pass@123` |

- `admin@onedot.com` → Management portal (full control)
- any employee email → Employee portal (limited access)

## Backend-only / Frontend-only

```bash
npm run dev -w apps/api       # API only
npm run dev -w apps/web       # Web only
```

## Building for production

```bash
npm run build
npm start
```

## Environment variables (apps/api/.env)

| Variable                 | Description                            |
| ------------------------- | -------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string           |
| `REDIS_URL`              | Redis connection string                |
| `JWT_SECRET`             | Access token secret                    |
| `JWT_REFRESH_SECRET`     | Refresh token secret                   |
| `PORT`                   | API port (default 4000)                |
| `CORS_ORIGIN`            | Allowed web origin(s)                  |
| `S3_*`                   | Optional Cloudflare R2/AWS S3 storage  |