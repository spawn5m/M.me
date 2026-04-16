#!/bin/bash
set -e

# ISOLAMENTO: tocca SOLO /opt/M.me e PM2 "mme"
# NON modificare: mps, bhs, mirigliani.cloud

cd /opt/M.me
git pull origin main

cd backend
npm ci
npm run build
npx prisma migrate deploy

cd ../frontend
npm ci
npm run build

pm2 restart mme
echo "Deploy M.me completato."
