#!/usr/bin/env bash
set -euo pipefail

DEV=false
PROD=false
IMPORTER=false

for arg in "$@"; do
  case "$arg" in
    --dev) DEV=true ;;
    --prod) PROD=true ;;
    --importer) IMPORTER=true ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if ! $DEV && ! $PROD && ! $IMPORTER; then
  echo "Usage: ./start.sh [--dev] [--prod] [--importer]"
  echo "  --dev       Start the Vite dev server (hot reload) at http://localhost:5173"
  echo "  --prod      Build and start the production nginx server at http://localhost:8080"
  echo "  --importer  One-shot: run the Digimon image importer to (re)download assets, then exit"
  exit 1
fi

if $DEV; then
  echo "Starting dev environment..."
  docker compose up -d --build web
fi

if $PROD; then
  echo "Starting prod environment..."
  docker compose --profile prod up -d --build prod
fi

if $IMPORTER; then
  echo "Running importer (one-shot asset download, not a persistent service)..."
  docker compose --profile tools run --rm importer
fi
