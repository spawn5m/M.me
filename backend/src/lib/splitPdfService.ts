import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import type { FastifyBaseLogger } from 'fastify'
import type { PrismaClient } from '@prisma/client'

const UPLOADS_PDF = path.resolve(process.cwd(), '..', 'uploads', 'pdf')
const PAGES_DIR = path.join(UPLOADS_PDF, 'pages')

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

  const bytes = fs.readFileSync(filePath)
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = srcDoc.getPageCount()

  await prisma.pdfCatalog.update({
    where: { id: catalogId },
    data: { totalPdfPages: total },
  })

  log.info({ slug, total }, 'Split PDF avviato')

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1
    const outPath = path.join(outDir, `${pageNum}.pdf`)

    if (fs.existsSync(outPath)) continue

    const pageDoc = await PDFDocument.create()
    const [copied] = await pageDoc.copyPages(srcDoc, [i])
    pageDoc.addPage(copied)
    const pageBytes = await pageDoc.save()
    fs.writeFileSync(outPath, pageBytes)
  }

  log.info({ slug }, 'Split PDF completato')
}
