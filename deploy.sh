#!/bin/bash
set -e

# ISOLAMENTO: tocca SOLO /opt/M.me e PM2 "mme"
# NON modificare: mps, bhs, mirigliani.cloud

cd /opt/M.me
git pull origin main

# npm ci dalla root workspace (hoisting corretto per monorepo)
npm ci

cd backend
npx prisma generate
npm run build
npx prisma migrate deploy

cd ../frontend
npm run build

pm2 restart mme
echo "Deploy M.me completato."
