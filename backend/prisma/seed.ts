import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createInterface } from 'readline/promises'

import { SYSTEM_PERMISSIONS } from '../src/lib/authorization/permissions'

const prisma = new PrismaClient()

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n🌱 Seed Mirigliani — Setup iniziale\n')

  console.log('→ Sincronizzazione permessi di sistema...')
  for (const permission of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ?? null,
        label: permission.label,
        description: permission.description,
        isSystem: permission.isSystem
      },
      create: {
        code: permission.code,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ?? null,
        label: permission.label,
        description: permission.description,
        isSystem: permission.isSystem
      }
    })
  }
  console.log(`✓ Permessi sincronizzati: ${SYSTEM_PERMISSIONS.length}`)

  // Controlla se Super Admin esiste già
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      userPermissions: { some: { permission: { code: 'users.is_super_admin' } } }
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

  const superAdminPermission = await prisma.permission.findUniqueOrThrow({
    where: { code: 'users.is_super_admin' }
  })

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      userPermissions: {
        create: { permissionId: superAdminPermission.id }
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
