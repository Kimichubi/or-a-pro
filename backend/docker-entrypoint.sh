#!/bin/sh
set -e

echo "Running database migrations..."
./goose -dir /app/migrations postgres "$DATABASE_URL" up

echo "Starting orcapro-api on :${APP_PORT}"
exec ./orcapro-api
