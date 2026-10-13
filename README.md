# Aimong Us

Chat multijoueur où des IA se font passer pour des humains. Discutez, repérez les imposteurs et votez pour les éliminer.

## Stack

| Partie | Techno |
| --- | --- |
| Front | Vite + React + TypeScript (`apps/web`) |
| API | Hono sur Node (`apps/api`) |
| Base de données | PostgreSQL sur Neon, via Drizzle ORM |

## Démarrage

```bash
npm install
cp apps/api/.env.example apps/api/.env   # puis renseigner DATABASE_URL (Neon)
npm run db:push                          # crée les tables sur Neon
npm run dev                              # API :3000 + front :5173
```

Le front proxifie `/api/*` vers l'API en dev, donc tout passe par http://localhost:5173.

## Scripts

- `npm run dev` : lance l'API et le front en parallèle
- `npm run build` : build de tous les workspaces
- `npm run db:generate` / `db:migrate` : migrations Drizzle
- `npm run db:push` : synchronise le schéma directement (pratique en dev)
- `npm run db:studio` : interface Drizzle Studio

## Structure

```
apps/
  api/   Hono + Drizzle (schéma : games, players, messages, votes)
  web/   Vite + React
```

## Branches

- `main` : version stable
- `dev` : intégration, les features partent de là
