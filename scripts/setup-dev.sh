#!/usr/bin/env bash
set -euo pipefail

# SkillSats first-time development bootstrap.
#
# This script performs the steps needed after a fresh clone:
#   1. verify required tools
#   2. copy .env.example to .env if needed
#   3. install npm dependencies
#   4. start PostgreSQL
#   5. apply Prisma migrations
#   6. seed the database
#   7. start the local Lightning regtest network
#   8. verify Lightning readiness

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "➡️  SkillSats development bootstrap starting..."

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    missing_commands+=("$name")
  fi
}

declare -a required_commands=(node npm docker curl jq)
declare -a missing_commands=()

for cmd in "${required_commands[@]}"; do
  require_command "$cmd"
done

if ! docker compose version >/dev/null 2>&1; then
  missing_commands+=("docker compose")
fi

if [[ ${#missing_commands[@]} -gt 0 ]]; then
  printf '\nERROR: Missing required dependencies:\n' >&2
  for cmd in "${missing_commands[@]}"; do
    printf '  - %s\n' "$cmd" >&2
  done
  printf '\nInstall the missing tools and rerun this script.\n' >&2
  exit 1
fi

printf 'Node: %s\n' "$(node --version)"
printf 'npm: %s\n' "$(npm --version)"
printf 'Docker: %s\n' "$(docker --version)"
printf 'Docker Compose: %s\n' "$(docker compose version | head -n 1)"

printf '\nChecking .env...\n'
# Copy default environment values if no .env exists.
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example."
else
  echo ".env already exists; leaving it unchanged."
fi

printf '\nInstalling npm dependencies...\n'
# Install locked dependencies from package-lock.json.
npm install

printf '\nStarting PostgreSQL...\n'
# Launch the local database container.
npm run db:up

printf '\nApplying Prisma migrations...\n'
# Apply existing migrations and generate the Prisma client.
npx prisma migrate dev

printf '\nSeeding the database...\n'
# Populate demo data for local development.
npx prisma db seed

printf '\nStarting local Lightning network...\n'
# Start the regtest Lightning network.
npm run lightning:up

printf '\nRunning Lightning health checks...\n'
# Verify that both local LND nodes are online and ready.
npm run lightning:check

printf '\n✅ SkillSats development setup is complete.\n'
printf "Run 'npm run dev:lightning' to start the app with the local Lightning network.\n"
