import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function HeroDark() {
  const { t } = useTranslation()

  return (
    <section
      style={{ backgroundColor: '#0D1E35' }}
      className="w-full min-h-[90vh] flex items-center"
    >
      <div className="max-w-screen-2xl mx-auto px-12 py-24 w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* LEFT — testo */}
        <div className="flex flex-col gap-8">
          {/* Badge */}
          <span
            className="font-['Inter'] text-xs font-medium uppercase tracking-widest"
            style={{ color: '#C9A96E' }}
          >
            {t('home.badge')}
          </span>

          {/* Headline */}
          <h1
            className="font-['Inter'] font-black uppercase leading-none -ml-0.5"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 7rem)',
              lineHeight: 0.9,
              color: '#FFFFFF',
            }}
          >
            {t('home.headline')}
          </h1>

          {/* Sottotitolo */}
          <p
            className="font-['Inter'] font-light text-lg leading-relaxed max-w-md"
            style={{ color: '#8A9BB5', fontStyle: 'italic' }}
          >
            {t('home.subheadline')}
          </p>

          {/* CTA */}
          <div className="flex items-center gap-8 mt-4">
            {/* CTA primario — outlined gold */}
            <Link
              to="/imprese-funebri"
              className="font-['Inter'] font-medium text-sm uppercase tracking-widest px-8 py-4 transition-all"
              style={{
                border: '1.5px solid #C9A96E',
                color: '#C9A96E',
                backgroundColor: 'transparent',
                borderRadius: 0,
              }}
            >
              {t('home.ctaPrimary')}
            </Link>

            {/* CTA secondario — testo con underline gold */}
            <Link
              to="/dove-siamo"
              className="font-['Inter'] font-medium text-sm uppercase tracking-widest pb-0.5 transition-colors"
              style={{
                color: '#8A9BB5',
                borderBottom: '2px solid #C9A96E',
              }}
            >
              {t('home.ctaSecondary')}
            </Link>
          </div>
        </div>

        {/* RIGHT — immagine placeholder */}
        <div
          className="hidden md:block w-full h-[520px]"
          style={{ backgroundColor: '#142032' }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
