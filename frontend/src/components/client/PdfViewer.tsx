import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Converte l'URL del PDF intero nell'URL della singola pagina pre-splittata.
 * /uploads/pdf/CATALOGO CEABIS 2024.pdf + page 42
 * → /uploads/pdf/pages/catalogo-ceabis-2024/42.pdf
 */
function pageUrl(catalogUrl: string, page: number): string {
  const filename = catalogUrl.split('/').pop() ?? ''
  const slug = filename
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return `/uploads/pdf/pages/${slug}/${page}.pdf`
}

interface PdfViewerProps {
  url: string
  initialPage?: number
}

export default function PdfViewer({ url, initialPage = 1 }: PdfViewerProps) {
  const [error, setError] = useState(false)

  const src = pageUrl(url, initialPage)

  if (error) {
    return (
      <div className="flex items-center justify-center border border-[#E5E0D8] bg-white p-8 text-sm text-[#6B7280]">
        Pagina catalogo non disponibile
      </div>
    )
  }

  return (
    <Document
      file={src}
      onLoadError={() => setError(true)}
      className="border border-[#E5E0D8] shadow-[0_2px_8px_rgba(26,43,74,0.08)]"
    >
      <Page pageNumber={1} width={600} renderTextLayer renderAnnotationLayer />
    </Document>
  )
}
