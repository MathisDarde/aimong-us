# Aimong Us

Multiplayer chat game where AIs disguise themselves as humans. Chat, spot the impostors and vote them out.

## Stack

| Part | Tech |
| --- | --- |
| Front | Vite + React + TypeScript + Tailwind v4 + shadcn/ui (`apps/web`) |
| API | Hono on Node (`apps/api`) |
| Database | PostgreSQL on Neon, via Drizzle ORM |
| Auth | Better Auth (email + password, cookie sessions) |

## Getting started

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then set DATABASE_URL (Neon)
openssl rand -hex 32                     # paste into BETTER_AUTH_SECRET
pnpm db:push                             # creates the tables on Neon
pnpm dev                                 # API :3000 + web :5173
```

In dev the web app proxies `/api/*` to the API, so everything goes through http://localhost:5173.

## Scripts

- `pnpm dev`: run the API and the web app in parallel
- `pnpm build`: build all workspaces
- `pnpm db:generate` / `db:migrate`: Drizzle migrations
- `pnpm db:push`: sync the schema directly (handy in dev)
- `pnpm db:studio`: Drizzle Studio

## Structure

```
apps/
  api/   Hono + Drizzle + Better Auth (schema: user, session, account, verification, rate_limit, games, players, messages, votes)
  web/   Vite + React
```

## Branches

- `main`: stable
- `dev`: integration, features start from here

## UI (shadcn/ui)

Components live in `apps/web/src/components/ui`. To add one:

```bash
cd apps/web
pnpm dlx shadcn@latest add dialog
```
