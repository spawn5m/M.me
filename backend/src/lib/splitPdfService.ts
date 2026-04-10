import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import type { FastifyBaseLogger } from 'fastify'
import type { PrismaClient } from '@prisma/client'

const UPLOADS_PDF = path.resolve(process.cwd(), '..', 'uploads', 'pdf')
const PAGES_DIR = path.join(UPLOADS_PDF, 'pages')

const PDFSEPARATE = '/opt/homebrew/bin/pdfseparate'
const PDFINFO = '/opt/homebrew/bin/pdfinfo'

export function slugify(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function countSplitPages(slug: string): number {
  const dir = path.join(PAGES_DIR, slug)
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).length
}

export function deleteSlugPages(slug: string): void {
  const dir = path.join(PAGES_DIR, slug)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function countPdfPages(filePath: string): number {
  const output = execFileSync(PDFINFO, [filePath], { encoding: 'utf8' })
  const match = output.match(/^Pages:\s+(\d+)/m)
  if (!match) throw new Error('pdfinfo: numero pagine non trovato')
  return parseInt(match[1], 10)
}

export async function runSplit(params: {
  catalogId: string
  filePath: string
  slug: string
  prisma: PrismaClient
  log: FastifyBaseLogger
}): Promise<void> {
  const { catalogId, filePath, slug, prisma, log } = params

  const outDir = path.join(PAGES_DIR, slug)
  fs.mkdirSync(outDir, { recursive: true })

  const total = countPdfPages(filePath)

  await prisma.pdfCatalog.update({
    where: { id: catalogId },
    data: { totalPdfPages: total },
  })

  log.info({ slug, total }, 'Split PDF avviato con pdfseparate')

  // pdfseparate crea: outDir/1.pdf, outDir/2.pdf, …
  const pattern = path.join(outDir, '%d.pdf')
  execFileSync(PDFSEPARATE, [filePath, pattern])

  log.info({ slug, total }, 'Split PDF completato')
}
