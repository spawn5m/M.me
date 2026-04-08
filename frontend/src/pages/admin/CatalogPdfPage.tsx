export default function CatalogPdfPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Gestione</p>
        <h2 className="text-2xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Catalogo PDF
        </h2>
      </div>

      <div className="bg-white border border-[#E5E0D8] p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)] space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-[#1A2B4A]">
          Split pagine catalogo
        </h3>
        <p className="text-sm text-[#6B7280] leading-relaxed">
          Dopo aver caricato un nuovo PDF in <code className="admin-code">uploads/pdf/</code>, eseguire
          lo script di split per generare le pagine singole utilizzate dal viewer clienti.
        </p>

        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">
              Split tutti i cataloghi
            </p>
            <code className="admin-code block">
              npx tsx /Users/spawn5m/Documents/DEV/M.me/backend/prisma/split-pdf.ts
            </code>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">
              Split catalogo specifico
            </p>
            <code className="admin-code block">
              npx tsx /Users/spawn5m/Documents/DEV/M.me/backend/prisma/split-pdf.ts "NOME CATALOGO.pdf"
            </code>
          </div>
        </div>

        <div className="border-t border-[#E5E0D8] pt-4">
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Le pagine vengono salvate in{' '}
            <code className="admin-code">uploads/pdf/pages/&#123;slug-catalogo&#125;/&#123;n&#125;.pdf</code>.
            Lo script salta le pagine già presenti — è sicuro rieseguirlo.
          </p>
        </div>
      </div>
    </div>
  )
}
