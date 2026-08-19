# Paaldabba — MilkTrack

A full-stack, installable PWA for tracking daily milk purchases. Log every pour in millilitres, set your own price per litre, and get a clean month-end bill with a single tap.

> **Why “Paaldabba”?** It’s the codebase name. The app itself is branded **MilkTrack**.

## Features

- **Daily logging** — tap preset amounts (250 ml / 500 ml / 750 ml / 1 L) or enter a custom quantity.
- **Price snapshotting** — your current rate is saved with each entry, so changing the price never rewrites past bills.
- **Month-end bill** — totals, per-day breakdowns, and a “mark as paid” action.
- **Calendar view** — see at a glance which days had milk and how much.
- **History** — browse past months and jump back to any bill.
- **Auth** — register/login with username + password, or sign in via Kimi OAuth.
- **PWA** — installable from the browser, offline app-shell caching, home-screen icon.
- **Responsive, dark UI** — Tailwind + custom glassmorphism components.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, React Router v7, Tailwind CSS v3, shadcn/ui, TanStack Query, tRPC |
| Backend | Hono, tRPC, Node.js |
| Database | MySQL / PlanetScale, Drizzle ORM |
| Auth | scrypt password hashing, JWT session cookies (`kimi_sid`), optional Kimi OAuth |
| Build | Vite (client) + esbuild (server bundle) |
| Container | Dockerfile multi-stage build |

## Project structure

```
.
├── api/                    # Hono / tRPC backend
│   ├── auth-router.ts      # username/password auth
│   ├── boot.ts             # app entry + static file serving
│   ├── context.ts          # tRPC context
│   ├── kim/                # Kimi OAuth + session helpers
│   ├── lib/                # env, cookies, HTTP client, Vite static helper
│   ├── middleware.ts       # tRPC init + auth middleware
│   ├── milkRouter.ts       # milk ledger procedures
│   ├── queries/            # DB query helpers
│   └── router.ts           # tRPC app router
├── contracts/              # Shared types + error helpers
├── db/                     # Drizzle schema, relations, migrations, seed
├── public/                 # PWA icons, manifest, service worker
├── src/                    # React frontend
│   ├── components/         # UI kit + MilkBottle SVG
│   ├── hooks/              # useAuth, use-mobile
│   ├── lib/                # milk formatting/date helpers
│   ├── pages/              # Home, Login, Dashboard, NotFound
│   ├── providers/          # tRPC provider
│   ├── sections/           # FluidSubconscious WebGL hero
│   └── ...                 # styles, config, main entry
├── .env.example            # Required environment variables
├── Dockerfile
├── drizzle.config.ts
├── package.json
└── vite.config.ts
```

## Quick start

1. Install dependencies:

   ```bash
   npm install
   # or, if npm install fails on your machine:
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

3. Run the database migrations (requires a MySQL-compatible database):

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs on [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the full list:

| Variable | Purpose |
|----------|---------|
| `APP_ID` | Application ID |
| `APP_SECRET` | Used to sign JWT session cookies |
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://user:pass@host:port/db` |
| `KIMI_AUTH_URL` | Kimi OAuth server URL (backend) |
| `KIMI_OPEN_URL` | Kimi Open Platform URL |
| `VITE_KIMI_AUTH_URL` | Same OAuth server URL, exposed to the browser |
| `VITE_APP_ID` | OAuth application ID, exposed to the browser |
| `OWNER_UNION_ID` | Union ID that automatically receives the `admin` role on first login |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with Hono backend |
| `npm run build` | Build production client + server bundle |
| `npm run start` | Run the production server (`dist/boot.js`) |
| `npm run check` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push schema changes to the database |

## Production

### Node

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

The server listens on `PORT` (default `3000`) and serves the built frontend from `dist/public`.

### Docker

```bash
docker build -t paaldabba .
docker run -p 3000:3000 --env-file .env paaldabba
```

## Deployment notes

- The production server needs the environment variables listed above.
- Make sure `APP_SECRET` is a strong, random value.
- `OWNER_UNION_ID` is only consulted on first login/upsert; set it before the owner signs in.
- The included service worker (`public/sw.js`) caches the app shell and navigates offline back to `/`.

## License

MIT
