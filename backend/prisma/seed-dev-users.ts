import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const SYSTEM_ROLES = [
  { name: 'super_admin', label: 'Super Admin' },
  { name: 'manager', label: 'Manager' },
  { name: 'collaboratore', label: 'Collaboratore' },
  { name: 'impresario_funebre', label: 'Impresario Funebre' },
  { name: 'marmista', label: 'Marmista' },
]

const BASE_PERMISSIONS = [
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'write' },
  { resource: 'users', action: 'delete' },
  { resource: 'roles', action: 'read' },
  { resource: 'roles', action: 'write' },
  { resource: 'roles', action: 'delete' },
  { resource: 'articles', action: 'read' },
  { resource: 'articles', action: 'write' },
  { resource: 'articles', action: 'delete' },
  { resource: 'pricelists', action: 'read' },
  { resource: 'pricelists', action: 'write' },
  { resource: 'pricelists', action: 'delete' },
  { resource: 'pricelists.purchase', action: 'read' },
  { resource: 'catalog', action: 'read' },
  { resource: 'catalog', action: 'write' },
]

const USERS = [
  { email: 'marco@mirigliani.me', password: 'maggigul', role: 'super_admin', firstName: 'Marco', lastName: 'Mirigliani' },
  { email: 'manager@test.it', password: 'manager', role: 'manager', firstName: 'Manager', lastName: 'Test' },
  { email: 'impresario_funebre@test.it', password: 'impresario_funebre', role: 'impresario_funebre', firstName: 'Impresario', lastName: 'Test' },
  { email: 'marmista@test.it', password: 'marmista', role: 'marmista', firstName: 'Marmista', lastName: 'Test' },
]

async function main() {
  // Ruoli
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name, label: role.label, isSystem: true },
    })
  }
  console.log('✓ Ruoli:', SYSTEM_ROLES.map((r) => r.name).join(', '))

  // Permessi
  for (const perm of BASE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    })
  }
  console.log(`✓ Permessi: ${BASE_PERMISSIONS.length}`)

  // Utenti
  for (const u of USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.role } })
    if (!role) {
      console.error(`✗ Ruolo non trovato: ${u.role}`)
      continue
    }

    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      console.log(`⚠ Già presente: ${u.email}`)
      continue
    }

    const hashed = await bcrypt.hash(u.password, 12)
    await prisma.user.create({
      data: {
        email: u.email,
        password: hashed,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: true,
        userRoles: { create: { roleId: role.id } },
      },
    })
    console.log(`✓ Creato: ${u.email}  [${u.role}]`)
  }
  console.log('\nDone.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
