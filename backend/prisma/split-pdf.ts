/**
 * Splitta ogni PDF in uploads/pdf/ in pagine singole.
 * Output: uploads/pdf/pages/{slug}/{n}.pdf  (1-based)
 *
 * Uso:
 *   npx tsx backend/prisma/split-pdf.ts
 *   npx tsx backend/prisma/split-pdf.ts "CATALOGO CEABIS 2024.pdf"
 */

import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

const UPLOADS_PDF = path.resolve(__dirname, '../../uploads/pdf')
const PAGES_DIR = path.join(UPLOADS_PDF, 'pages')

function slugify(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function splitPdf(filename: string) {
  const src = path.join(UPLOADS_PDF, filename)
  if (!fs.existsSync(src)) {
    console.error(`✗ File non trovato: ${src}`)
    return
  }

  const slug = slugify(filename)
  const outDir = path.join(PAGES_DIR, slug)
  fs.mkdirSync(outDir, { recursive: true })

  console.log(`\n→ ${filename}  (slug: ${slug})`)

  const bytes = fs.readFileSync(src)
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = srcDoc.getPageCount()
  console.log(`  Pagine totali: ${total}`)

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1
    const outPath = path.join(outDir, `${pageNum}.pdf`)

    // Salta se già esiste
    if (fs.existsSync(outPath)) {
      process.stdout.write(`\r  Pagina ${pageNum}/${total} (già presente, skip)`)
      continue
    }

    const pageDoc = await PDFDocument.create()
    const [copied] = await pageDoc.copyPages(srcDoc, [i])
    pageDoc.addPage(copied)
    const pageBytes = await pageDoc.save()
    fs.writeFileSync(outPath, pageBytes)

    process.stdout.write(`\r  Pagina ${pageNum}/${total}`)
  }

  console.log(`\n✓ Split completato → ${outDir}`)
}

async function main() {
  fs.mkdirSync(PAGES_DIR, { recursive: true })

  const target = process.argv[2]

  if (target) {
    await splitPdf(target)
    return
  }

  const files = fs.readdirSync(UPLOADS_PDF).filter((f) => f.toLowerCase().endsWith('.pdf'))
  if (files.length === 0) {
    console.log('Nessun PDF trovato in uploads/pdf/')
    return
  }

  for (const file of files) {
    await splitPdf(file)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
