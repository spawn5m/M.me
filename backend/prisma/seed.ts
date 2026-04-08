import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createInterface } from 'readline/promises'

import { SYSTEM_PERMISSIONS } from '../src/lib/authorization/permissions'
import { SYSTEM_ROLE_DEFAULTS } from '../src/lib/authorization/role-defaults'

const prisma = new PrismaClient()

const SYSTEM_ROLES = [
  { name: 'super_admin', label: 'Super Admin' },
  { name: 'manager', label: 'Manager' },
  { name: 'collaboratore', label: 'Collaboratore' },
  { name: 'impresario_funebre', label: 'Impresario Funebre' },
  { name: 'marmista', label: 'Marmista' }
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

  console.log('→ Sincronizzazione permessi di default per ruolo...')
  for (const role of SYSTEM_ROLES) {
    const roleRecord = await prisma.role.findUnique({ where: { name: role.name } })

    if (!roleRecord) {
      throw new Error(`Ruolo di sistema mancante: ${role.name}`)
    }

    const permissionCodes = SYSTEM_ROLE_DEFAULTS[role.name]
    const permissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
      select: { id: true, code: true }
    })

    if (permissions.length !== permissionCodes.length) {
      const foundCodes = new Set(permissions.map((permission) => permission.code))
      const missingCodes = permissionCodes.filter((code) => !foundCodes.has(code))
      throw new Error(`Permessi mancanti per ${role.name}: ${missingCodes.join(', ')}`)
    }

    const permissionIds = permissions.map((permission) => permission.id)

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: roleRecord.id,
        permissionId: { notIn: permissionIds }
      }
    })

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleRecord.id,
            permissionId
          }
        },
        update: {},
        create: {
          roleId: roleRecord.id,
          permissionId
        }
      })
    }
  }
  console.log('✓ Matrice ruolo -> permessi sincronizzata')

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
