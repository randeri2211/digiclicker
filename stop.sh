#!/usr/bin/env bash
set -euo pipefail

echo "Stopping and removing all DigiClicker containers (dev, prod)..."
docker compose --profile prod --profile tools down --remove-orphans --volumes
