import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import HeroDark from '../components/home/HeroDark'
import FooterDark from '../components/layout/FooterDark'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <div style={{ backgroundColor: '#071325' }}>
      {/* Hero */}
      <HeroDark />

      {/* Sezione Per le Imprese Funebri */}
      <section
        className="w-full py-24 border-t"
        style={{ backgroundColor: '#071325', borderColor: '#1E2D45' }}
      >
        <div className="max-w-screen-2xl mx-auto px-12 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Testo */}
          <div className="flex flex-col gap-6 justify-center">
            <h2
              className="font-['Newsreader'] font-bold leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#FFFFFF' }}
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
              className="font-['Inter'] font-medium text-sm uppercase tracking-widest self-start px-8 py-4 transition-all"
              style={{
                border: '1.5px solid #C9A96E',
                color: '#C9A96E',
                backgroundColor: 'transparent',
                borderRadius: 0,
              }}
            >
              {t('home.sectionFunebriCta')}
            </Link>
          </div>

          {/* Immagine placeholder */}
          <div
            className="hidden md:block w-full h-[400px]"
            style={{ backgroundColor: '#0D1E35' }}
            aria-hidden="true"
          />
        </div>
      </section>

      {/* Sezione Per i Marmisti */}
      <section
        className="w-full py-24 border-t"
        style={{ backgroundColor: '#0D1E35', borderColor: '#1E2D45' }}
      >
        <div className="max-w-screen-2xl mx-auto px-12 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Immagine placeholder (a sinistra per alternare) */}
          <div
            className="hidden md:block w-full h-[400px]"
            style={{ backgroundColor: '#142032' }}
            aria-hidden="true"
          />

          {/* Testo */}
          <div className="flex flex-col gap-6 justify-center">
            <h2
              className="font-['Newsreader'] font-bold leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#FFFFFF' }}
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
              className="font-['Inter'] font-medium text-sm uppercase tracking-widest self-start px-8 py-4 transition-all"
              style={{
                border: '1.5px solid #C9A96E',
                color: '#C9A96E',
                backgroundColor: 'transparent',
                borderRadius: 0,
              }}
            >
              {t('home.sectionMarmistiCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Strip Location — Villamar | Sassari */}
      <section
        className="w-full py-20 border-t"
        style={{ backgroundColor: '#071325', borderColor: '#1E2D45' }}
      >
        <div className="max-w-screen-2xl mx-auto px-12">
          {/* Titolo */}
          <p
            className="font-['Inter'] text-xs font-medium uppercase tracking-widest text-center mb-16"
            style={{ color: '#C9A96E' }}
          >
            {t('home.locationTitle')}
          </p>

          {/* Due colonne con linea verticale gold */}
          <div className="grid grid-cols-2 divide-x" style={{ borderColor: '#C9A96E' }}>
            {/* Villamar */}
            <div className="flex flex-col items-center gap-4 pr-12 text-center">
              <h3
                className="font-['Newsreader'] font-semibold"
                style={{ fontSize: '2rem', color: '#FFFFFF' }}
              >
                {t('home.locationVillamar')}
              </h3>
              <p
                className="font-['Inter'] text-sm"
                style={{ color: '#8A9BB5' }}
              >
                Medio Campidano, Sardegna
              </p>
            </div>

            {/* Sassari */}
            <div className="flex flex-col items-center gap-4 pl-12 text-center">
              <h3
                className="font-['Newsreader'] font-semibold"
                style={{ fontSize: '2rem', color: '#FFFFFF' }}
              >
                {t('home.locationSassari')}
              </h3>
              <p
                className="font-['Inter'] text-sm"
                style={{ color: '#8A9BB5' }}
              >
                Sassari, Sardegna
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterDark />
    </div>
  )
}
