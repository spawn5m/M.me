import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'La Nostra Storia', path: '/storia' },
  { label: 'Dove Siamo', path: '/dove-siamo' },
  { label: 'Per le Imprese Funebri', path: '/imprese-funebri' },
  { label: 'Per i Marmisti', path: '/marmisti' },
  { label: 'Area Riservata', path: '/area-riservata' },
]

export default function FooterLight() {
  return (
    <footer className="bg-[#1A2B4A]">
      <div className="max-w-screen-2xl mx-auto py-12 px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Colonna 1 — Brand */}
        <div className="flex flex-col gap-4">
          <span className="font-['Newsreader'] text-2xl tracking-tight uppercase font-semibold text-white">
            MIRIGLIANI
          </span>
          <p className="font-['Inter'] text-sm text-white/60 leading-relaxed max-w-xs">
            Grossista di forniture funebri e marmi in Sardegna.
            Due sedi: Villamar e Sassari.
          </p>
        </div>

        {/* Colonna 2 — Navigazione */}
        <div className="flex flex-col gap-3">
          <p className="font-['Inter'] text-[10px] tracking-widest uppercase text-white/40 mb-2">
            Navigazione
          </p>
          {NAV_LINKS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className="font-['Inter'] text-sm text-white/60 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Colonna 3 — Contatti */}
        <div className="flex flex-col gap-3">
          <p className="font-['Inter'] text-[10px] tracking-widest uppercase text-white/40 mb-2">
            Contatti
          </p>
          <address className="not-italic font-['Inter'] text-sm text-white/60 leading-relaxed space-y-3">
            <div>
              <p className="text-white text-xs uppercase tracking-wider mb-1">Villamar</p>
              <p>Via Example 1, Villamar (SU)</p>
              <p>Tel: +39 070 000 0000</p>
            </div>
            <div>
              <p className="text-white text-xs uppercase tracking-wider mb-1">Sassari</p>
              <p>Via Example 2, Sassari (SS)</p>
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
      <div className="border-t border-white/10 py-6 px-12 max-w-screen-2xl mx-auto">
        <p className="font-['Inter'] text-xs text-white/40">
          © {new Date().getFullYear()} Mirigliani. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  )
}
