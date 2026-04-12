import { useTranslation } from 'react-i18next'
import { useBranding } from '../context/BrandingContext'

export default function NostraStoriaPage() {
  const { t } = useTranslation()
  const { images } = useBranding()

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Hero centrato */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          {/* Linea verticale gold */}
          <div className="w-px h-12 bg-[#C9A96E]" />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
            {t('ourStory.subtitle')}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl text-[#031634] tracking-tight">
            {t('ourStory.title')}
          </h1>
          <p className="text-[#6B7280] text-lg italic max-w-xl leading-relaxed">
            {t('ourStory.heroTagline')}
          </p>
          <div className="w-px h-12 bg-[#C9A96E]" />
        </div>
      </section>

      {/* Sezione narrativa: 5/12 immagine + 7/12 testo */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          {/* Immagine placeholder — sinistra */}
          <div className="md:col-span-5">
            {images['storia-narrativa'] ? (
              <img
                src={images['storia-narrativa']!}
                alt="La nostra storia"
                className="aspect-[4/5] w-full object-cover border-2 border-transparent hover:border-[#C9A96E] transition-colors duration-300"
              />
            ) : (
              <div className="group aspect-[4/5] relative overflow-hidden border-2 border-transparent hover:border-[#C9A96E] transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A2B4A] via-[#2C4A7C] to-[#1A2B4A] group-hover:from-[#2C4A7C] group-hover:via-[#3D6B9E] group-hover:to-[#1A3A5C] scale-100 group-hover:scale-[1.20] transition-all duration-500" />
                <div className="absolute inset-0 flex items-end p-6">
                  <span className="text-white/20 group-hover:text-[#C9A96E] font-serif text-6xl leading-none transition-colors duration-300">1988</span>
                </div>
              </div>
            )}
          </div>

          {/* Testo — destra */}
          <div className="md:col-span-7 flex flex-col gap-6">
            <div className="w-8 h-px bg-[#C9A96E]" />
            <p className="text-[#1A1A1A] text-lg leading-relaxed">
              {t('ourStory.narrative')}
            </p>
            <p className="text-[#6B7280] text-base leading-relaxed">
              {t('ourStory.narrativeParagraph1')}
            </p>
            <p className="text-[#6B7280] text-base leading-relaxed">
              {t('ourStory.narrativeParagraph2')}
            </p>
          </div>
        </div>
      </section>

      {/* Sezione valori — 3 card */}
      <section className="bg-white border-y border-[#E5E0D8] py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E] text-center mb-12">
            {t('ourStory.valuesTitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Qualità */}
            <div className="group flex flex-col gap-4 p-8 border border-[#E5E0D8] hover:border-[#C9A96E] hover:shadow-[0_4px_24px_rgba(201,169,110,0.10)] hover:scale-[1.02] transition-all duration-200">
              <div className="w-8 h-px bg-[#C9A96E] group-hover:w-full transition-all duration-300" />
              <h3 className="font-serif text-2xl text-[#031634]">
                {t('ourStory.value1Title')}
              </h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                {t('ourStory.value1Desc')}
              </p>
            </div>

            {/* Tradizione */}
            <div className="group flex flex-col gap-4 p-8 border border-[#E5E0D8] hover:border-[#C9A96E] hover:shadow-[0_4px_24px_rgba(201,169,110,0.10)] hover:scale-[1.02] transition-all duration-200">
              <div className="w-8 h-px bg-[#C9A96E] group-hover:w-full transition-all duration-300" />
              <h3 className="font-serif text-2xl text-[#031634]">
                {t('ourStory.value2Title')}
              </h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                {t('ourStory.value2Desc')}
              </p>
            </div>

            {/* Servizio */}
            <div className="group flex flex-col gap-4 p-8 border border-[#E5E0D8] hover:border-[#C9A96E] hover:shadow-[0_4px_24px_rgba(201,169,110,0.10)] hover:scale-[1.02] transition-all duration-200">
              <div className="w-8 h-px bg-[#C9A96E] group-hover:w-full transition-all duration-300" />
              <h3 className="font-serif text-2xl text-[#031634]">
                {t('ourStory.value3Title')}
              </h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                {t('ourStory.value3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Strip sedi */}
      <section className="py-16 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E] text-center mb-10">
            {t('ourStory.locationTitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E0D8]">
            {/* Villamar */}
            <div className="flex flex-col items-center text-center py-10 px-6">
              <h4 className="font-serif text-2xl text-[#031634] mb-2">Villamar</h4>
              <p className="text-[#6B7280] text-sm">{t('whereWeAre.villamarAddress')}</p>
              <p className="text-[#6B7280] text-sm">{t('whereWeAre.villamarPhone')}</p>
            </div>

            {/* Sassari */}
            <div className="flex flex-col items-center text-center py-10 px-6">
              <h4 className="font-serif text-2xl text-[#031634] mb-2">Sassari</h4>
              <p className="text-[#6B7280] text-sm">{t('whereWeAre.sassariAddress')}</p>
              <p className="text-[#6B7280] text-sm">{t('whereWeAre.sassariPhone')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
