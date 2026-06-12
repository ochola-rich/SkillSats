#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "➡️  SkillSats development bootstrap starting..."

declare -a required_commands=(node npm docker curl jq)
declare -a missing_commands=()

for cmd in "${required_commands[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    missing_commands+=("$cmd")
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  missing_commands+=("docker compose")
fi

if [[ ${#missing_commands[@]} -gt 0 ]]; then
  echo "\nERROR: Missing required dependencies:" >&2
  for cmd in "${missing_commands[@]}"; do
    echo "  - $cmd" >&2
  done
  echo "\nInstall the missing tools and rerun this script." >&2
  exit 1
fi

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose version | head -n 1)"

echo "\nChecking .env..."
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example."
else
  echo ".env already exists; leaving it unchanged."
fi

echo "\nInstalling npm dependencies..."
npm install

echo "\nStarting PostgreSQL..."
npm run db:up

echo "\nApplying Prisma migrations..."
npx prisma migrate deploy

echo "\nSeeding the database..."
npx prisma db seed

echo "\nStarting local Lightning network..."
npm run lightning:up

echo "\nRunning Lightning health checks..."
npm run lightning:check

echo "\n✅ SkillSats development setup is complete."
echo "Run 'npm run dev:lightning' to start the app with the local Lightning network."
