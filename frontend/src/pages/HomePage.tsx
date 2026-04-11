import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, getDefaultRoute } from '../context/AuthContext'
import { useBranding } from '../context/BrandingContext'

export default function HomePage() {
  const { t } = useTranslation()
  const { user, permissions } = useAuth()
  const { logoUrl } = useBranding()

  const reservedAreaHref = getDefaultRoute(user, permissions)

  return (
    <div style={{ backgroundColor: '#071325' }}>

      {/* ── Sezione 0 — MIRIGLIANI centrato ─────────────────── */}
      <section
        className="w-full min-h-screen flex flex-col items-center justify-center gap-12 px-8"
        style={{ backgroundColor: '#071325' }}
      >
        {/* Logo aziendale (1/5 della larghezza del titolo) */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Mirigliani logo"
            className="object-contain"
            style={{ width: 'clamp(3.5rem, 8vw, 7rem)', height: 'auto' }}
          />
        )}

        {/* Wordmark */}
        <h1
          className="font-['Inter'] font-black uppercase tracking-tight text-center leading-none"
          style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', color: '#FFFFFF' }}
        >
          MIRIGLIANI
        </h1>

        {/* Pulsanti principali */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            to="/storia"
            className="btn-home-gold font-['Inter'] font-medium text-sm uppercase tracking-[0.15em] px-8 py-4"
          >
            {t('nav.ourStory')}
          </Link>

          <Link
            to="/dove-siamo"
            className="btn-home-gold font-['Inter'] font-medium text-sm uppercase tracking-[0.15em] px-8 py-4"
          >
            {t('nav.whereWeAre')}
          </Link>
        </div>

        {/* Area Riservata */}
        <Link
          to={reservedAreaHref}
          className="btn-home-gold font-['Inter'] font-medium text-sm uppercase tracking-[0.15em] px-8 py-4"
        >
          {t('nav.reservedArea')}
        </Link>
      </section>

      {/* ── Sezione 1 — Per le Imprese Funebri ──────────────── */}
      <section
        className="w-full min-h-screen flex items-center border-t"
        style={{ backgroundColor: '#071325', borderColor: '#1E2D45' }}
      >
        <div className="max-w-screen-2xl mx-auto px-12 py-24 w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-6 justify-center">
            <p
              className="font-['Inter'] text-xs font-medium uppercase tracking-widest"
              style={{ color: '#C9A96E' }}
            >
              {t('home.sectionFunebriInt')}
            </p>
            <h2
              className="font-['Inter'] font-bold leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 6rem)', color: '#FFFFFF' }}
            >
              {t('home.sectionFunebri')}
            </h2>
            <p
              className="font-['Inter'] font-light text-base leading-relaxed max-w-md"
              style={{ color: '#8A9BB5' }}
            >
              {t('home.sectionFunebriDesc')}
            </p>
            <Link
              to="/imprese-funebri"
              className="btn-home-gold font-['Inter'] font-medium text-sm uppercase tracking-widest self-start px-8 py-4"
            >
              {t('home.sectionFunebriCta')}
            </Link>
          </div>
          <div
            className="hidden md:block w-full h-[500px]"
            style={{ backgroundColor: '#0D1E35' }}
            aria-hidden="true"
          />
        </div>
      </section>

      {/* ── Sezione 2 — Per i Marmisti ───────────────────────── */}
      <section
        className="w-full min-h-screen flex items-center border-t"
        style={{ backgroundColor: '#0D1E35', borderColor: '#1E2D45' }}
      >
        <div className="max-w-screen-2xl mx-auto px-12 py-24 w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div
            className="hidden md:block w-full h-[500px]"
            style={{ backgroundColor: '#142032' }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-6 justify-center">
            <p
              className="font-['Inter'] text-xs font-medium uppercase tracking-widest"
              style={{ color: '#C9A96E' }}
            >
              {t('home.sectionMarmistiInt')}
            </p>
            <h2
              className="font-['Inter'] font-bold leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 6rem)', color: '#FFFFFF' }}
            >
              {t('home.sectionMarmisti')}
            </h2>
            <p
              className="font-['Inter'] font-light text-base leading-relaxed max-w-md"
              style={{ color: '#8A9BB5' }}
            >
              {t('home.sectionMarmistiDesc')}
            </p>
            <Link
              to="/marmisti"
              className="btn-home-gold font-['Inter'] font-medium text-sm uppercase tracking-widest self-start px-8 py-4"
            >
              {t('home.sectionMarmistiCta')}
            </Link>
          </div>
        </div>
      </section>
      {/* ── Sezione 3 — Cimiteri - Crematori - Case Funerarie ───────────────────────── */}
      <section
        className="w-full min-h-screen flex items-center border-t"
        style={{ backgroundColor: '#0D1E35', borderColor: '#1E2D45' }}
      >
        <div className="max-w-screen-2xl mx-auto px-12 py-24 w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div
            className="hidden md:block w-full h-[500px]"
            style={{ backgroundColor: '#142032' }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-6 justify-center">
            <p
              className="font-['Inter'] text-xs font-medium uppercase tracking-widest"
              style={{ color: '#C9A96E' }}
            >
              {t('home.sectionAltriInt')}
            </p>
            <h2
              className="font-['Inter'] font-bold leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 6rem)', color: '#FFFFFF' }}
            >
              {t('home.sectionAltri')}
            </h2>
            <p
              className="font-['Inter'] font-light text-base leading-relaxed max-w-md"
              style={{ color: '#8A9BB5' }}
            >
              {t('home.sectionAltriDesc')}
            </p>
            <Link
              to="/marmisti"
              className="btn-home-gold font-['Inter'] font-medium text-sm uppercase tracking-widest self-start px-8 py-4"
            >
              {t('home.sectionAltriCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sezione 3 — Strip Location ───────────────────────── */}
      <section
        className="w-full min-h-screen flex flex-col items-center justify-center border-t px-12"
        style={{ backgroundColor: '#071325', borderColor: '#1E2D45' }}
      >
        <p
          className="font-['Inter'] text-xs font-medium uppercase tracking-widest text-center mb-20"
          style={{ color: '#C9A96E' }}
        >
          {t('home.locationTitle')}
        </p>
        <div className="w-full max-w-screen-2xl grid grid-cols-2 divide-x" style={{ borderColor: '#C9A96E' }}>
          <div className="flex flex-col items-center gap-4 pr-16 text-center">
            <h3
              className="font-['Inter'] font-semibold"
              style={{ fontSize: '2.5rem', color: '#FFFFFF' }}
            >
              {t('home.locationVillamar')}
            </h3>
            <p className="font-['Inter'] text-sm" style={{ color: '#8A9BB5' }}>
              {t('home.locationVillamarRegion')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 pl-16 text-center">
            <h3
              className="font-['Inter'] font-semibold"
              style={{ fontSize: '2.5rem', color: '#FFFFFF' }}
            >
              {t('home.locationSassari')}
            </h3>
            <p className="font-['Inter'] text-sm" style={{ color: '#8A9BB5' }}>
              {t('home.locationSassariRegion')}
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
