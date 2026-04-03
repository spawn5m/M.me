import { config } from 'dotenv'
import { spawnSync } from 'child_process'
import path from 'path'

// Carica .env prima di tutto
config({ path: path.resolve(__dirname, '../.env') })

// Sostituisce DATABASE_URL con quella di test
const testUrl = process.env.DATABASE_URL_TEST
if (!testUrl) {
  throw new Error('DATABASE_URL_TEST non configurata nel file .env')
}
process.env.DATABASE_URL = testUrl

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
