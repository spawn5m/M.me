import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createInterface } from 'readline/promises'

const prisma = new PrismaClient()

const SYSTEM_ROLES = [
  { name: 'super_admin', label: 'Super Admin' },
  { name: 'manager', label: 'Manager' },
  { name: 'collaboratore', label: 'Collaboratore' },
  { name: 'impresario_funebre', label: 'Impresario Funebre' },
  { name: 'marmista', label: 'Marmista' }
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
  { resource: 'catalog', action: 'write' }
]

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n🌱 Seed Mirigliani — Setup iniziale\n')

  // Ruoli di sistema
  console.log('→ Creazione ruoli di sistema...')
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name, label: role.label, isSystem: true }
    })
  }
  console.log('✓ Ruoli creati:', SYSTEM_ROLES.map((r) => r.name).join(', '))

  // Permessi base
  console.log('→ Creazione permessi base...')
  for (const perm of BASE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm
    })
  }
  console.log(`✓ Permessi creati: ${BASE_PERMISSIONS.length}`)

  // Controlla se Super Admin esiste già
  const existingSuperAdmin = await prisma.user.findFirst({
    include: { userRoles: { include: { role: true } } },
    where: {
      userRoles: { some: { role: { name: 'super_admin' } } }
    }
  })

  if (existingSuperAdmin) {
    console.log(`\n✓ Super Admin già presente: ${existingSuperAdmin.email}`)
    console.log('  Seed completato — nessuna azione richiesta.\n')
    rl.close()
    return
  }

  // Creazione interattiva Super Admin
  console.log('\n→ Creazione Super Admin iniziale\n')
  const email = await rl.question('  Email Super Admin: ')

  if (!email.includes('@')) {
    console.error('✗ Email non valida')
    rl.close()
    process.exit(1)
  }

  const password = await rl.question('  Password (min 8 caratteri): ')
  const confirm = await rl.question('  Conferma password: ')
  rl.close()

  if (password.length < 8) {
    console.error('✗ Password troppo corta (minimo 8 caratteri)')
    process.exit(1)
  }

  if (password !== confirm) {
    console.error('✗ Le password non coincidono')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super_admin' }
  })

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      userRoles: {
        create: { roleId: superAdminRole!.id }
      }
    }
  })

  console.log(`\n✓ Super Admin creato: ${user.email}`)
  console.log('  Seed completato.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
