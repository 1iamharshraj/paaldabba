# Paaldabba / MilkTrack

A full-stack, installable PWA for tracking daily milk purchases. Log every pour in millilitres, set your own price per litre, and get a clean month-end bill with a single tap.

> **Note on the name:** `Paaldabba` is the repository/codename. The app is branded **MilkTrack** in the UI.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [User roles](#user-roles)
- [Scripts](#scripts)
- [Deployment](#deployment)
  - [Vercel](#vercel)
  - [Docker](#docker)
  - [Node](#node)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Daily logging** — tap preset amounts (250 ml / 500 ml / 750 ml / 1 L) or enter a custom quantity.
- **Price snapshotting** — your current rate is saved with each entry, so changing the price never rewrites past bills.
- **Month-end bill** — totals, per-day breakdowns, and a "mark as paid" action.
- **Calendar view** — see at a glance which days had milk and how much.
- **History** — browse past months and jump back to any bill.
- **Auth** — register/login with username + password.
- **Milkman / client roles** — milkmen can create client accounts, set a shared rate, and manage each client's ledger. Clients can also register on their own and link to a milkman by username.
- **PWA** — installable from the browser, offline app-shell caching, home-screen icon.
- **Responsive, dark UI** — Tailwind + custom glassmorphism components.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, React Router v7, Tailwind CSS v3, shadcn/ui, TanStack Query, tRPC |
| Backend | Hono, tRPC, Node.js |
| Database | PostgreSQL / Supabase, Drizzle ORM |
| Auth | scrypt password hashing, JWT session cookies (`sid`) |
| Build | Vite (client) + esbuild (server bundle) |
| Container | Dockerfile multi-stage build |

---

## Project structure

```
.
├── api/                    # Vercel serverless function entry
│   └── index.ts            # re-exports the Hono app
├── server/                 # Hono / tRPC backend source
│   ├── auth-router.ts      # username/password auth + milkman client creation
│   ├── boot.ts             # app entry + static file serving
│   ├── context.ts          # tRPC context
│   ├── lib/                # env, cookies, session/auth helpers, Vite static helper
│   ├── middleware.ts       # tRPC init + auth/role middleware
│   ├── milkRouter.ts       # milk ledger procedures
│   ├── queries/            # DB query helpers
│   └── router.ts           # tRPC app router
├── contracts/              # Shared types + error helpers
│   └── router.ts           # re-export of AppRouter for the frontend
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
├── vite.config.ts
└── vitest.config.ts
```

---

## Quick start

1. Install dependencies:

   ```bash
   npm install
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

---

## Environment variables

See `.env.example` for the full list:

| Variable | Purpose |
|----------|---------|
| `APP_ID` | Application ID |
| `APP_SECRET` | Used to sign JWT session cookies |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:port/db` |

---

## User roles

### Milkman

- Registers as a **Milkman** from the login screen.
- Has a personal milk ledger.
- Can add **Clients** from the `/clients` page.
- Each client gets their own ledger linked to the milkman.
- The milkman can view, edit, and mark months as paid for any linked client.
- Changing the milkman's price per litre updates the default rate for all linked clients.

### Client

- Registers as a **Client** from the login screen.
- Can optionally enter a **Milkman username** during registration to link to an existing milkman.
- Has a personal milk ledger.
- Can log daily milk purchases and mark months as paid.
- A linked client inherits the milkman's price per litre.

---

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

---

## Deployment

### Vercel (recommended)

The repo is configured for Vite + a single Hono serverless function.

1. Import the repo on [Vercel](https://vercel.com).
2. Set the environment variables in the Vercel dashboard:
   - `APP_ID` — any stable identifier, e.g. `paaldabba`
   - `APP_SECRET` — a strong random string (used to sign session cookies)
   - `DATABASE_URL` — PostgreSQL connection string (Supabase, Aiven, local Postgres, etc.)
3. Vercel will auto-detect Vite and run `npm run build`.
   - Frontend static files are output to `dist/`
   - Backend is bundled to `dist/server/boot.js` for Node/Docker
   - `api/index.ts` is deployed as the only serverless function; the backend source lives in `server/`
4. Push a branch; Vercel builds previews automatically.
5. For local Vercel testing, install the [Vercel CLI](https://vercel.com/docs/cli) and run:

   ```bash
   vercel dev
   ```

> **Hobby plan note:** Vercel's free tier limits a deployment to 12 serverless functions. To stay under that limit, all backend code was moved to `server/` and only `api/index.ts` is exposed as a function.

### Docker

```bash
docker build -t paaldabba .
docker run -p 3000:3000 --env-file .env paaldabba
```

### Node

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

The server listens on `PORT` (default `3000`) and serves the built frontend from `dist`.

---

## Troubleshooting

### Vercel: "No more than 12 Serverless Functions"

Make sure backend source files are in `server/`, not `api/`. Only `api/index.ts` should be a top-level file inside `api/`.

### Vercel: "The pattern ... doesn't match any Serverless Functions"

Check `vercel.json` — the function entry is configured as `api/index.ts`.

### TypeScript: relative import paths need explicit file extensions

The project uses `"type": "module"` with Node16 module resolution. Relative imports in the backend must include the `.js` extension (e.g. `./boot.js`).

### Database connection errors

- Verify `DATABASE_URL` includes the correct protocol (`postgresql://`).
- For Supabase, use the connection string from **Project Settings → Database → Connection string → URI**, and append `?sslmode=require`.
- Example: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`

### npm install fails with a mirror registry error

If `npm install` fails because of a missing mirror host, regenerate `package-lock.json` from the default registry:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## License

MIT
