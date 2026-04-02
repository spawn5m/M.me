import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'


const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'La Nostra Storia', path: '/storia' },
  { label: 'Dove Siamo', path: '/dove-siamo' },
  { label: 'Per le Imprese Funebri', path: '/imprese-funebri' },
  { label: 'Per i Marmisti', path: '/marmisti' },
  { label: 'Area Riservata', path: '/area-riservata' },
]

export default function FooterDark() {
  const { t } = useTranslation()

  return (
    <footer className="bg-[#070F1C] border-t border-[#C9A96E]">
      <div className="max-w-screen-2xl mx-auto py-16 px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Colonna 1 — Brand + descrizione */}
        <div className="flex flex-col gap-4">
          <span className="font-['Newsreader'] text-2xl tracking-tight uppercase font-semibold text-white">
            MIRIGLIANI
          </span>
          <p className="font-['Inter'] text-sm text-[#8A9BB5] leading-relaxed max-w-xs">
            Grossista di forniture funebri e marmi in Sardegna.
            Due sedi: Villamar e Sassari.
          </p>
        </div>

        {/* Colonna 2 — Navigazione */}
        <div className="flex flex-col gap-3">
          <p className="font-['Inter'] text-[10px] tracking-widest uppercase text-[#C9A96E] mb-2">
            Navigazione
          </p>
          {NAV_LINKS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className="font-['Inter'] text-sm text-[#8A9BB5] hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Colonna 3 — Contatti */}
        <div className="flex flex-col gap-3">
          <p className="font-['Inter'] text-[10px] tracking-widest uppercase text-[#C9A96E] mb-2">
            Contatti
          </p>
          <address className="not-italic font-['Inter'] text-sm text-[#8A9BB5] leading-relaxed space-y-3">
            <div>
              <p className="text-white text-xs uppercase tracking-wider mb-1">Villamar</p>
              <p>Via Example 1, Villamar (SU)</p>
              <p>Tel: +39 070 000 0000</p>
            </div>
            <div>
              <p className="text-white text-xs uppercase tracking-wider mb-1">Sassari</p>
              <p>{t('whereWeAre.sassariAddress')}</p>
              <p>Tel: +39 079 000 0000</p>
            </div>
            <div>
              <a
                href="mailto:info@mirigliani.it"
                className="text-[#C9A96E] hover:text-white transition-colors"
              >
                info@mirigliani.it
              </a>
            </div>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1E2D45] py-6 px-12 max-w-screen-2xl mx-auto">
        <p className="font-['Inter'] text-xs text-[#8A9BB5]">
          © {new Date().getFullYear()} Mirigliani. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  )
}
