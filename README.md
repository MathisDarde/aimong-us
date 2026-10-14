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

## Game rules

- The host starts the game (4 to 6 players, 1 or 2 AIs). Each round has a theme and a random speaking order: every active player answers once, 30 seconds per turn.
- Then everyone votes for 15 seconds (AIs vote too). The player with the most votes is eliminated and their role is revealed; a tie eliminates nobody.
- The humans win when every AI is out. The AIs win when they are at least as many as the humans, or when round 5 ends with an AI still in.
- AI players write their own messages through Scaleway Generative APIs (any OpenAI-compatible endpoint works, see `AI_*` in `apps/api/.env.example`) when `AI_API_KEY` is set; without it they just pass their turn.
- Roles are only sent to clients for eliminated players, and for everyone once the game is finished.

## Security notes

- Private API routes require an `Authorization: Bearer <jwt>` header (WebSockets send it as the `bearer` subprotocol). Access tokens last 15 minutes and are verified without a database lookup, so a token stays valid until it expires even after sign-out.
- Server errors never reach the client: unexpected failures answer `500 { error: "Internal error", requestId }`, and the details are written to stderr as one JSON line carrying the same `requestId`. SQL parameters are redacted from those logs.

## Deployment constraints

Game rooms and online presence live in the API process memory, so the API must run as a single instance until they move to a shared store.

## Deploying to AWS

Production runs as a single container on an Amazon Lightsail container service in `eu-north-1`. The image (root `Dockerfile`) builds the web app and the API; the API serves the built web app next to `/api/*`, so everything stays on one origin.

Prerequisites: AWS CLI v2 signed in with `aws login --profile aimong-us`, `lightsailctl` (`brew install aws/tap/lightsailctl`), Docker or Podman, and a `.env.production` file at the repo root:

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
# Optional, lets AI players write messages
AI_API_KEY=...
AI_BASE_URL=https://api.scaleway.ai/<project-id>/v1
```

Then:

```bash
pnpm deploy:aws
```

Pushing to `main` also deploys automatically through `.github/workflows/deploy.yml`. It needs four repository secrets: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (the `aimong-us-github-deploy` IAM user, limited to Lightsail container deployments), `DATABASE_URL` and `BETTER_AUTH_SECRET`, plus the optional `AI_API_KEY` and `AI_BASE_URL` (Scaleway project endpoint) that let AI players write messages.

The first run creates the container service. Each run builds the image, pushes it, deploys it and prints the public URL. Run `pnpm db:migrate` against the production database before deploying code that needs new migrations.

## Branches

- `main`: stable
- `dev`: integration, features start from here

## UI (shadcn/ui)

Components live in `apps/web/src/components/ui`. To add one:

```bash
cd apps/web
pnpm dlx shadcn@latest add dialog
```
