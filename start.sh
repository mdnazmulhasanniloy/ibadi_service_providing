#!/bin/sh
# start.sh
set -e

echo "📦 Generating Prisma client..."
# pnpm prisma generate

echo "🚀 Starting server..."
node dist/server.js