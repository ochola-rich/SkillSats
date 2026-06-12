# Contributing to SkillSats

Thank you for contributing to SkillSats. This guide explains how to configure the project, run it
locally, and verify changes before opening a pull request.

## Prerequisites

Install the following tools:

- Node.js 22.12 or newer
- npm
- Docker with Docker Compose
- `curl` and `jq` for the headless Lightning bootstrap

Bitcoin Core and LND are not required to install dependencies, start the application, or run the
automated checks. Lightning configuration is optional; without it, paid video purchases, invoice
settlement polling, and withdrawals report that Lightning is unavailable while the rest of the
application continues to work.

## Install Dependencies

Clone the repository, enter its directory, and install the locked dependencies:

```bash
git clone <repository-url>
cd SkillSats
npm install
```

Use npm for dependency changes so `package-lock.json` remains authoritative.

## Configure Environment Variables

Copy the default development environment into a local `.env` file:

```bash
cp .env.example .env
```

The example config connects to the Docker PostgreSQL service with:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillsats"
```

Replace `JWT_SECRET` before starting the application. Configure `LND_REST_HOST` and `LND_MACAROON`
only when connecting to an external LND node for Lightning integration testing.

| Variable            | Required | Purpose                                     |
| ------------------- | -------- | ------------------------------------------- |
| `DATABASE_URL`      | Yes      | PostgreSQL connection string used by Prisma |
| `JWT_SECRET`        | Yes      | Signs authentication cookies                |
| `LND_REST_HOST`     | No       | Base URL for the SkillSats LND REST API     |
| `LND_MACAROON`      | No       | Hex-encoded LND macaroon                    |
| `LND_MACAROON_PATH` | No       | Alternative path to a local macaroon file   |
| `LND_TLS_CERT_PATH` | No       | CA certificate for the LND HTTPS connection |

Do not commit `.env` files or real Lightning credentials.

## Local Lightning Integration

For a production-like development test, run the application against real LND nodes on Bitcoin
regtest. Regtest coins have no real-world value, while invoices, HTLC settlement, channel
liquidity, macaroons, and LND REST behavior remain representative of production.

The Docker Compose Lightning profile runs:

- Bitcoin Core 31.0 in regtest mode.
- LND 0.21.0-beta named `skillsats`, used by the application.
- LND 0.21.0-beta named `payer`, representing an external learner or creator wallet.

Start and bootstrap the network:

```bash
npm run lightning:up
```

This command creates both wallets through LND's WalletUnlocker REST API, mines spendable regtest
coins, funds `payer`, and opens a 1,000,000 sat channel with 500,000 sats pushed to `skillsats`.
Both nodes therefore have outbound liquidity. The initial run can take several minutes while the
first 101 blocks are mined; later runs reuse the persisted state.

The bootstrap writes disposable macaroon credentials to the ignored
`.local-lightning/app.env` file. REST and gRPC ports bind only to host loopback:

| Node       | REST                     | gRPC              |
| ---------- | ------------------------ | ----------------- |
| SkillSats  | `https://127.0.0.1:8080` | `127.0.0.1:10009` |
| Test payer | `https://127.0.0.1:8081` | `127.0.0.1:10010` |

LND uses self-signed TLS certificates in this disposable environment. The application's existing
development-only TLS relaxation accepts them; production does not.

Verify node and channel readiness, then settle one payment in each direction:

```bash
npm run lightning:check
npm run lightning:test
```

Start SkillSats with the generated credentials:

```bash
npm run dev:lightning
```

Exercise a paid video purchase:

1. Start SkillSats and log in as `learner@test.com` with password `password123`.
2. Open a paid video and select **Unlock** to create an invoice on the `skillsats` node.
3. Copy the BOLT11 invoice and pay it from the separate `payer` node:

```bash
npm run lightning:pay -- "<bolt11-invoice>"
```

The browser's settlement poll should reveal the video, and 90% of the price should be credited to
the video's creator exactly once.

Exercise a creator withdrawal by creating an invoice on the external node:

```bash
npm run lightning:invoice -- 100 "SkillSats creator withdrawal"
```

Log in as `creator@test.com`, paste the returned invoice into the wallet, enter the same sat amount,
and withdraw. The `skillsats` node pays the `payer` node through the same LND endpoint used in
production.

Follow logs or stop the containers without deleting state:

```bash
npm run lightning:logs
npm run lightning:down
```

Delete all local Lightning wallets, channels, and regtest chain data with:

```bash
npm run lightning:reset
```

The reset command is destructive only to `.local-lightning/` and the Bitcoin regtest Docker volume.
PostgreSQL data is left intact.

## Prepare the Database

Start the PostgreSQL container:

```bash
npm run db:up
```

The command waits until PostgreSQL is healthy. Its data is kept in the `postgres-data` Docker
volume, so stopping or recreating the container does not erase the development database.

Apply all migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Seed the database with demo users, videos, and an ad:

```bash
npx prisma db seed
```

The seeded accounts all use the password `password123`:

| Role       | Email                 |
| ---------- | --------------------- |
| Learner    | `learner@test.com`    |
| Creator    | `creator@test.com`    |
| Advertiser | `advertiser@test.com` |

The seed command deletes existing application records before inserting demo data. Do not run it
against a database containing data you need to keep.

Use `npm run db:logs` to follow PostgreSQL logs and `npm run db:down` to stop the local database.

## Run in Development

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

TanStack Router regenerates `src/routeTree.gen.ts` when route files change. Do not edit that file
manually.

## Project Structure

```text
src/routes/          TanStack Router file-based routes
src/server/          TanStack Start server functions
src/lib/*.server.ts  Server-only database, auth, and LND infrastructure
src/components/      Shared React components
src/context/         React context providers
src/hooks/           Shared React hooks
prisma/              Schema, migrations, and seed data
```

## Routing Conventions

TanStack Start uses file-based routing. Route modules belong in `src/routes/`; do not create
Next.js or Remix structures such as `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx`. The only root layout is `src/routes/__root.tsx`.

| File                     | URL                                                            |
| ------------------------ | -------------------------------------------------------------- |
| `index.tsx`              | `/`                                                            |
| `about.tsx`              | `/about`                                                       |
| `users/index.tsx`        | `/users`                                                       |
| `users/$id.tsx`          | `/users/:id` (dynamic; bare `$`, no curly braces)              |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                         |
| `files/$.tsx`            | `/files/*` (splat; read through `_splat`, never `*`)           |
| `_layout.tsx`            | Pathless layout route; render children with `<Outlet />`       |
| `__root.tsx`             | Application shell; wraps every page and preserves `<Outlet />` |

Use `.tsx` route modules for browser pages and `.ts` route modules for server-only API handlers.
Nested directories and flat dot-separated names are both supported; follow the surrounding route
style and avoid defining two files that resolve to the same URL.

The current browser routes are:

| File                 | URL               | Access                                    |
| -------------------- | ----------------- | ----------------------------------------- |
| `index.tsx`          | `/`               | Public                                    |
| `learn.$videoId.tsx` | `/learn/:videoId` | Public metadata; login for paid purchases |
| `login.tsx`          | `/login`          | Public                                    |
| `register.tsx`       | `/register`       | Public                                    |
| `earn.tsx`           | `/earn`           | Public page; login to claim rewards       |
| `wallet.tsx`         | `/wallet`         | Authenticated                             |
| `dashboard.tsx`      | `/dashboard`      | Creator accounts                          |

## Server Functions and HTTP API

Keep application business logic and authorization in `createServerFn` handlers under `src/server`.
Client components should call those typed functions directly with `useServerFn` rather than using
an Axios or `fetch` client.

Stable JSON endpoints for external clients and OpenAPI tooling live under `src/routes/api`. They
are thin server-route adapters over the same server functions; do not duplicate validation,
authorization, accounting, database, or Lightning rules in route handlers.

The API contract is maintained in `docs/openapi.json`. Update it whenever an API route, server
function input, response shape, authentication rule, or documented browser route changes. Important
conventions include:

- The local development server defaults to `http://localhost:5173`.
- Authentication uses the HTTP-only `auth_token` cookie, not a bearer token response.
- JSON mutation requests from browsers must be same-origin.
- Video creation accepts an existing `url`; multipart video upload is not implemented.
- TanStack's generated `/_serverFn` identifiers are internal transport details and are not a stable
  external API.

## Database Changes

After changing `prisma/schema.prisma`, create a descriptive migration:

```bash
npx prisma migrate dev --name describe_the_change
```

Commit both the schema change and generated migration. Validate the schema with:

```bash
npx prisma validate
```

## Quality Checks

Run the complete verification suite before submitting a change:

```bash
npm run check
```

This command checks formatting, runs ESLint and TypeScript, executes tests, and creates a production
build. Individual commands are also available:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Add or update tests when changing validation, accounting rules, authentication, or shared domain
behavior.

## Commit and Pull Request Guidelines

- Keep commits focused on one concern.
- Use conventional commit messages, such as `feat:`, `fix:`, `refactor:`, `test:`, or `chore:`.
- Do not commit generated build output, environment files, credentials, or unrelated formatting.
- Describe database migrations, user-visible behavior, and verification performed in the pull
  request.
- Confirm `npm run check` passes before requesting review.
