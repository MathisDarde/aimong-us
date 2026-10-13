# CLAUDE.md

## Project

Aimong Us: multiplayer chat game where AIs disguised as humans hide among players. Players chat on a themed prompt, vote, and the masks fall.

pnpm monorepo:

| Path | Stack |
| --- | --- |
| `apps/web` | Vite, React 19, TypeScript, Tailwind v4, shadcn/ui |
| `apps/api` | Hono on Node, Drizzle ORM, PostgreSQL (Neon) |

## Critical Rules

1. **Always use pnpm** (never npm/yarn). Node >= 22.
2. **English everywhere**: code, identifiers, comments, commit messages, branch names, PRs, docs, and user-facing copy.
3. **No non-essential comments**: code should be self-explanatory. Comment only a non-obvious *why*, never the *what*. No commented-out code.
4. **One branch per change** (feature, fix, chore...). Never commit directly to `main` or `dev`.
5. **Every branch lives in its own worktree**. Do not switch branches inside the main checkout.
6. **Read before you write**: match the surrounding code's naming, structure and idioms.
7. **Verify before declaring done**: typecheck, lint and build must pass.

## Commands

```bash
pnpm install
pnpm dev              # API :3000 + web :5173 (web proxies /api/* to the API)
pnpm dev:api
pnpm dev:web
pnpm build            # Build all workspaces

pnpm db:generate      # Generate migrations from the schema
pnpm db:migrate       # Apply migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio

cd apps/web && pnpm dlx shadcn@latest add <component>
```

Per-app checks: `pnpm --filter @aimong-us/web exec tsc -b`, `pnpm --filter @aimong-us/web exec oxlint`, `pnpm --filter @aimong-us/api typecheck`.

## Git Workflow

- `main`: stable. `dev`: integration. Every branch starts from `dev` and is merged back into `dev` through a PR.
- Branch names: `<type>/<short-kebab-description>`, with type one of `feat`, `fix`, `chore`, `refactor`, `docs`, `test`. Example: `feat/lobby-code-join`.
- Commits follow Conventional Commits: `feat: add lobby join form`. Imperative, lowercase, no trailing period.
- Stage specific files (`git add <path>`), never `git add -A` / `git commit -a`.
- Never commit `.env` files or secrets. Keep `.env.example` up to date when adding variables.
- Never force-push `main` or `dev`.

### Worktrees

One worktree per branch, so several changes can progress in parallel without stashing.

```bash
git fetch origin
git worktree add .claude/worktrees/<name> -b <type>/<name> origin/dev
cd .claude/worktrees/<name> && pnpm install

git worktree list
git worktree remove .claude/worktrees/<name>   # after the PR is merged
git branch -d <type>/<name>
```

- `<name>` is the branch's kebab-case description without the type prefix.
- `.claude/worktrees/` is git-ignored.
- Each worktree has its own `node_modules` and its own `.env`: copy `apps/api/.env` from the main checkout.
- Run dev servers on distinct ports when two worktrees run at once.
- Remove a worktree as soon as its branch is merged.

## Code Style

- Files: **kebab-case** (`spot-the-ai.tsx`, `use-media-query.ts`). Components `PascalCase`, hooks `useCamelCase`, constants `SCREAMING_SNAKE_CASE`.
- Strict TypeScript. No `any`; use `unknown` and narrow. Use `import type` for type-only imports (`verbatimModuleSyntax`).
- Use `@/` for app-local imports in `apps/web`.
- Function components only. Hooks at the top level, never conditional. No components defined inside components.
- Early returns over nested conditionals. No nested ternaries.
- Name magic numbers and repeated literals as constants.
- Prefer `async/await`, `for...of`, optional chaining and nullish coalescing.
- Keep files and components small and single-purpose. Extract when a file mixes concerns.
- No `console.log`, `debugger` or dead code in committed code.
- Reuse before creating: search `components/`, `hooks/` and `lib/` for an existing helper first.
- Semantic HTML and accessible markup: labels on inputs, `button` for actions, `a` for navigation, meaningful `alt`/`aria-*`.
- Add `rel="noopener noreferrer"` to `target="_blank"` links.

## Web (`apps/web`)

- UI components from shadcn/ui live in `src/components/ui`. Feature components live in `src/components/<feature>/`. Pages in `src/pages/`.
- Add shadcn components with the CLI only when used; do not keep unused ones.
- Style with Tailwind utilities and `cn()` from `@/lib/utils`. No inline `style` unless the value is dynamic.
- Use the design tokens from `src/index.css` (`nuit`, `ink`, `creme`, `rose`, `jaune`, `menthe`, `cyan`) and the `shadow-hard-*` utility. Never hard-code colors or shadows that a token already covers.
- Responsive behavior goes through CSS (breakpoints, `clamp()`), not JS, unless the logic really depends on it.
- Fonts are self-hosted through `@fontsource-variable/*`. No third-party font or tracking requests.
- Server data goes through the API under `/api/*`.

## API (`apps/api`)

- Hono app in `src/app.ts`, routes in `src/routes/`, Drizzle schema in `src/db/`, env parsing in `src/env.ts`.
- Read environment variables only through `src/env.ts`, never `process.env` directly elsewhere.
- Validate every request input at the route boundary.
- Change the schema, then run `pnpm db:generate` and `pnpm db:migrate`. Never hand-write SQL migrations.

## Dependencies

- Build-time tooling (Tailwind, Vite plugins, type packages) goes in `devDependencies`.
- Do not downgrade or loosen a dependency range without a stated reason.
- Do not add a dependency for something a few lines of code or an existing dependency already covers.

## Before Finishing

```bash
pnpm --filter @aimong-us/web exec tsc -b
pnpm --filter @aimong-us/web exec oxlint
pnpm --filter @aimong-us/api typecheck
pnpm build
```

Anything intentionally left undone (stub, TODO, skipped review finding) must be mentioned in the PR description.
