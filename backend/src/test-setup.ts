import { spawnSync } from 'child_process'
import path from 'path'

// Usa il DB di test
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST!
process.env.SESSION_SECRET = 'test-session-secret-min32chars-dev-only!!'
process.env.SESSION_SALT = 'test-salt-16char'
process.env.NODE_ENV = 'test'

// Applica le migration al DB di test
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
})

if (result.status !== 0) {
  throw new Error('Prisma migrate deploy fallita sul DB di test')
}
