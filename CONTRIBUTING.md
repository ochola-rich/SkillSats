# Contributing to SkillSats

Thank you for contributing to SkillSats. This guide explains how to configure the project, run it
locally, and verify changes before opening a pull request.

## Prerequisites

Install the following tools:

- Node.js 22.12 or newer
- npm
- Docker with Docker Compose
- Bitcoin Core (`bitcoind` and `bitcoin-cli`)
- LND (`lnd` and `lncli`)

Bitcoin Core and LND are system dependencies for development integration testing. The automated
unit, type, lint, and build checks do not start them, but contributors need both to test the complete
payment workflow locally.

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

Update the placeholder `JWT_SECRET`, `LND_REST_HOST`, and `LND_MACAROON` values in `.env` as needed.
The variables serve these purposes:

| Variable        | Purpose                                     |
| --------------- | ------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string used by Prisma |
| `JWT_SECRET`    | Signs authentication cookies                |
| `LND_REST_HOST` | Base URL for the LND REST API               |
| `LND_MACAROON`  | Hex-encoded LND macaroon sent with requests |

Do not commit `.env` files or real Lightning credentials.

## Set Up a Local Lightning Network

Bitcoin Core and LND do not need to be running for `npm test`, `npm run check`, database work,
authentication, free videos, or ad rewards. They must be running for these development integration
tests:

| Flow                      | Why LND is needed                                   |
| ------------------------- | --------------------------------------------------- |
| Purchase a paid video     | Creates a BOLT11 invoice                            |
| Poll a purchase           | Checks whether the invoice settled                  |
| Withdraw creator earnings | Decodes and pays an invoice from an external wallet |

The following setup uses the installed `bitcoind`, `bitcoin-cli`, `lnd`, and `lncli` binaries. It
runs one Bitcoin Core regtest node and two isolated LND nodes:

- `skillsats`: the node used by the application.
- `payer`: a test wallet that pays purchases and receives withdrawals.

All local state is written under `.local-lightning/`, which is ignored by Git.

Start Bitcoin Core:

```bash
mkdir -p .local-lightning/bitcoin

bitcoind \
  -regtest \
  -server \
  -txindex \
  -fallbackfee=0.0002 \
  -rpcuser=skillsats \
  -rpcpassword=skillsats \
  -zmqpubrawblock=tcp://127.0.0.1:28332 \
  -zmqpubrawtx=tcp://127.0.0.1:28333 \
  -datadir="$PWD/.local-lightning/bitcoin" \
  -daemon

bitcoin-cli \
  -regtest \
  -datadir="$PWD/.local-lightning/bitcoin" \
  createwallet miner
```

Start the SkillSats LND node in one terminal:

```bash
mkdir -p .local-lightning/lnd-skillsats

lnd \
  --lnddir="$PWD/.local-lightning/lnd-skillsats" \
  --alias=skillsats \
  --bitcoin.regtest \
  --bitcoin.node=bitcoind \
  --bitcoind.rpchost=127.0.0.1:18443 \
  --bitcoind.rpcuser=skillsats \
  --bitcoind.rpcpass=skillsats \
  --bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332 \
  --bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333 \
  --listen=127.0.0.1:9735 \
  --rpclisten=127.0.0.1:10009 \
  --restlisten=127.0.0.1:8080
```

Start the payer node in another terminal. It must use different peer, RPC, and REST ports:

```bash
mkdir -p .local-lightning/lnd-payer

lnd \
  --lnddir="$PWD/.local-lightning/lnd-payer" \
  --alias=payer \
  --bitcoin.regtest \
  --bitcoin.node=bitcoind \
  --bitcoind.rpchost=127.0.0.1:18443 \
  --bitcoind.rpcuser=skillsats \
  --bitcoind.rpcpass=skillsats \
  --bitcoind.zmqpubrawblock=tcp://127.0.0.1:28332 \
  --bitcoind.zmqpubrawtx=tcp://127.0.0.1:28333 \
  --listen=127.0.0.1:9736 \
  --rpclisten=127.0.0.1:10010 \
  --restlisten=127.0.0.1:8081
```

Create both wallets. These commands prompt for local wallet passwords and display seed phrases:

```bash
lncli \
  --network=regtest \
  --lnddir="$PWD/.local-lightning/lnd-skillsats" \
  --rpcserver=127.0.0.1:10009 \
  create

lncli \
  --network=regtest \
  --lnddir="$PWD/.local-lightning/lnd-payer" \
  --rpcserver=127.0.0.1:10010 \
  create
```

After restarting an existing node, replace `create` with `unlock` and enter that node's wallet
password.

For the remaining commands, source the helper script from the repository root to keep the
node selection readable:

```bash
source scripts/local-lightning.sh
```

The following shell functions are now available:

```bash
btc() {
  bitcoin-cli -regtest -datadir="$PWD/.local-lightning/bitcoin" "$@"
}

skillsats_ln() {
  lncli --network=regtest \
    --lnddir="$PWD/.local-lightning/lnd-skillsats" \
    --rpcserver=127.0.0.1:10009 "$@"
}

payer_ln() {
  lncli --network=regtest \
    --lnddir="$PWD/.local-lightning/lnd-payer" \
    --rpcserver=127.0.0.1:10010 "$@"
}
```

Mine spendable regtest coins, fund the payer node, and confirm the deposit:

```bash
btc generatetoaddress 101 "$(btc getnewaddress)"

# Copy the address field from this response:
payer_ln newaddress p2wkh

btc sendtoaddress <payer-address> 0.02
btc generatetoaddress 6 "$(btc getnewaddress)"
```

Connect the nodes and open one balanced channel. Copy each node's `identity_pubkey` from
`skillsats_ln getinfo` and `payer_ln getinfo`:

```bash
payer_ln connect <skillsats-pubkey>@127.0.0.1:9735

payer_ln openchannel \
  --node_key=<skillsats-pubkey> \
  --local_amt=1000000 \
  --push_amt=500000

btc generatetoaddress 6 "$(btc getnewaddress)"
```

The pushed balance gives `skillsats` outbound liquidity for withdrawals while the payer retains
outbound liquidity for purchases. Confirm that the channel is active with:

```bash
skillsats_ln listchannels
payer_ln listchannels
```

Configure SkillSats to use the first node. Convert its admin macaroon to hex:

```bash
od -An -vtx1 \
  .local-lightning/lnd-skillsats/data/chain/bitcoin/regtest/admin.macaroon |
  tr -d ' \n'
```

Place the output and REST address in `.env`:

```dotenv
LND_REST_HOST="https://127.0.0.1:8080"
LND_MACAROON="<admin-macaroon-hex>"
```

The development client accepts LND's self-signed TLS certificate. Never use this relaxation or an
admin macaroon outside a disposable local regtest environment.

Verify the connection after loading `.env` into the shell:

```bash
set -a
source .env
set +a
curl --fail --silent --show-error --insecure \
  --header "Grpc-Metadata-Macaroon: $LND_MACAROON" \
  "$LND_REST_HOST/v1/getinfo"
```

The response should contain the `skillsats` alias and identity public key.

To exercise both payment directions:

1. Start SkillSats, log in as the seeded learner, and unlock a paid video.
2. Copy the displayed invoice and pay it with `payer_ln payinvoice <invoice>`. SkillSats should
   detect settlement and reveal the video.
3. Create an invoice with `payer_ln addinvoice --amt=<sats>` and copy its `payment_request`.
4. Log in to SkillSats as the seeded creator and withdraw to that invoice. The requested amount
   must match the invoice and fit within both the creator balance and the `skillsats` node's
   outbound channel balance.

All coins in this setup are regtest coins with no real-world value. Stop the nodes with
`skillsats_ln stop`, `payer_ln stop`, and `btc stop` when they are no longer needed.

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
