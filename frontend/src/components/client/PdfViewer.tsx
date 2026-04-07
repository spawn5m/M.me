import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PdfViewerProps {
  url: string
  initialPage?: number
}

export default function PdfViewer({ url, initialPage = 1 }: PdfViewerProps) {
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="flex items-center justify-center border border-[#E5E0D8] bg-white p-8 text-sm text-[#6B7280]">
        PDF non disponibile
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setTotal(numPages)}
        onLoadError={() => setError(true)}
        className="border border-[#E5E0D8] shadow-[0_2px_8px_rgba(26,43,74,0.08)]"
      >
        <Page pageNumber={page} width={600} renderTextLayer renderAnnotationLayer />
      </Document>

      {total > 0 && (
        <div className="flex items-center gap-4 text-sm text-[#6B7280]">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-[#E5E0D8] px-3 py-1 transition-colors hover:border-[#1A2B4A] disabled:opacity-40"
          >
            ‹
          </button>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {page} / {total}
          </span>
          <button
            onClick={() => setPage(p => Math.min(total, p + 1))}
            disabled={page >= total}
            className="border border-[#E5E0D8] px-3 py-1 transition-colors hover:border-[#1A2B4A] disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
