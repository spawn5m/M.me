import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function FooterLight() {
  const { t } = useTranslation()

  // NAV_LINKS come funzione dipendente da `t`
  const NAV_LINKS = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.ourStory'), path: '/storia' },
    { label: t('nav.whereWeAre'), path: '/dove-siamo' },
    { label: t('nav.funeralHomes'), path: '/imprese-funebri' },
    { label: t('nav.marmistas'), path: '/marmisti' },
    { label: t('nav.altris'), path: '/altri' },
    { label: t('nav.reservedArea'), path: '/area-riservata' },
  ]

  return (
    <footer className="bg-[#1A2B4A]">
      <div className="max-w-screen-2xl mx-auto py-12 px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Colonna 1 — Brand */}
        <div className="flex flex-col gap-4">
          <span className="font-['Newsreader'] text-2xl tracking-tight uppercase font-semibold text-white">
            MIRIGLIANI
          </span>
          <p className="font-['Inter'] text-sm text-white/60 leading-relaxed max-w-xs">
            {t('footer.textClaim')}
          </p>
        </div>

        {/* Colonna 2 — Navigazione */}
        <div className="flex flex-col gap-3">
          <p className="font-['Inter'] text-[10px] tracking-widest uppercase text-white/40 mb-2">
            {t('footer.navigation')}
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
            {t('footer.contacts')}
          </p>
          <address className="not-italic font-['Inter'] text-sm text-white/60 leading-relaxed space-y-3">
            <div>
              <p className="text-white text-xs uppercase tracking-wider mb-1">Villamar</p>
              <p>{t('whereWeAre.villamarAddress')}</p>
              <p>{t('whereWeAre.villamarPhone')}</p>
            </div>
            <div>
              <p className="text-white text-xs uppercase tracking-wider mb-1">Sassari</p>
              <p>{t('whereWeAre.sassariAddress')}</p>
              <p>{t('whereWeAre.sassariPhone')}</p>
            </div>
            <div>
              <a
                href="mailto:info@mirigliani.it"
                className="text-[#C9A96E] hover:text-white transition-colors"
              >
                {t('whereWeAre.contactMyMail')}
              </a>
            </div>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-6 px-12 max-w-screen-2xl mx-auto">
        <p className="font-['Inter'] text-xs text-white/40">
          © {new Date().getFullYear()} Mirigliani. {t('footer.rightsReserved')}
        </p>
      </div>
    </footer>
  )
}