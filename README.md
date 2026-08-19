# Paaldabba — MilkTrack

A full-stack, installable PWA for tracking daily milk purchases. Log every pour in millilitres, set your own price per litre, and get a clean month-end bill with a single tap.

> **Why “Paaldabba”?** It’s the codebase name. The app itself is branded **MilkTrack**.

## Features

- **Daily logging** — tap preset amounts (250 ml / 500 ml / 750 ml / 1 L) or enter a custom quantity.
- **Price snapshotting** — your current rate is saved with each entry, so changing the price never rewrites past bills.
- **Month-end bill** — totals, per-day breakdowns, and a “mark as paid” action.
- **Calendar view** — see at a glance which days had milk and how much.
- **History** — browse past months and jump back to any bill.
- **Auth** — register/login with username + password.
- **Milkman / client roles** — milkmen can link client accounts, set a shared rate, and manage each client's ledger.
- **PWA** — installable from the browser, offline app-shell caching, home-screen icon.
- **Responsive, dark UI** — Tailwind + custom glassmorphism components.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, React Router v7, Tailwind CSS v3, shadcn/ui, TanStack Query, tRPC |
| Backend | Hono, tRPC, Node.js |
| Database | MySQL / PlanetScale, Drizzle ORM |
| Auth | scrypt password hashing, JWT session cookies (`sid`) |
| Build | Vite (client) + esbuild (server bundle) |
| Container | Dockerfile multi-stage build |

## Project structure

```
.
├── api/                    # Hono / tRPC backend
│   ├── auth-router.ts      # username/password auth
│   ├── boot.ts             # app entry + static file serving
│   ├── context.ts          # tRPC context
│   ├── lib/                # env, cookies, session/auth helpers, Vite static helper
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
│   ├── pages/              # Home, Login, Dashboard, Clients, ClientLedger, NotFound
│   ├── providers/          # tRPC provider
│   ├── sections/           # FluidSubconscious WebGL hero
│   └── ...                 # styles, config, main entry
├── .env.example            # Required environment variables
├── Dockerfile
├── drizzle.config.ts
├── package.json
├── vercel.json             # Vercel deployment config
├── index.ts                # Vercel serverless function entry
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

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with Hono backend |
| `npm run build` | Build production client + server bundle |
| `npm run start` | Run the production server (`dist/server/boot.js`) |
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

The server listens on `PORT` (default `3000`) and serves the built frontend from `dist`.

### Docker

```bash
docker build -t paaldabba .
docker run -p 3000:3000 --env-file .env paaldabba
```

### Vercel

The repo includes a `vercel.json` configured for a Vite frontend + Hono serverless function.

1. Import the repo on [Vercel](https://vercel.com).
2. Set the environment variables in the Vercel dashboard:
   - `APP_ID` — any stable identifier, e.g. `paaldabba`
   - `APP_SECRET` — a strong random string (used to sign session cookies)
   - `DATABASE_URL` — MySQL connection string (PlanetScale, Aiven, etc.)
3. Vercel will auto-detect Vite and run `npm run build`.
   - Frontend static files are output to `dist/`
   - Backend is bundled to `dist/server/boot.js` for Node/Docker
   - Vercel deploys `index.ts` as the serverless function
4. Push a branch; Vercel builds previews automatically.
5. For local Vercel testing, install the [Vercel CLI](https://vercel.com/docs/cli) and run:

   ```bash
   vercel dev
   ```

## Deployment notes

- The production server needs the environment variables listed above.
- Make sure `APP_SECRET` is a strong, random value.
- The included service worker (`public/sw.js`) caches the app shell and navigates offline back to `/`.

## License

MIT
