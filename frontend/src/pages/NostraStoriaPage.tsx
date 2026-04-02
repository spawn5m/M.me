import { useTranslation } from 'react-i18next'

export default function NostraStoriaPage() {
  const { t } = useTranslation()

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
            Grossista di forniture funebri e marmi in Sardegna
          </p>
          <div className="w-px h-12 bg-[#C9A96E]" />
        </div>
      </section>

      {/* Sezione narrativa: 5/12 immagine + 7/12 testo */}
      <section className="px-6 md:px-12 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          {/* Immagine placeholder — sinistra */}
          <div className="md:col-span-5">
            <div className="aspect-[4/5] bg-[#1A2B4A] relative overflow-hidden">
              <div className="absolute inset-0 flex items-end p-6">
                <span className="text-white/20 font-serif text-6xl leading-none">1965</span>
              </div>
            </div>
          </div>

          {/* Testo — destra */}
          <div className="md:col-span-7 flex flex-col gap-6">
            <div className="w-8 h-px bg-[#C9A96E]" />
            <p className="text-[#1A1A1A] text-lg leading-relaxed">
              {t('ourStory.narrative')}
            </p>
            <p className="text-[#6B7280] text-base leading-relaxed">
              Nata come piccola realtà artigianale nella provincia del Sud Sardegna,
              Mirigliani è cresciuta fino a diventare il fornitore di riferimento per le imprese
              funebri e i marmisti di tutta l'isola. Due sedi operative — Villamar e Sassari —
              garantiscono copertura capillare su tutto il territorio regionale.
            </p>
            <p className="text-[#6B7280] text-base leading-relaxed">
              Ogni prodotto che distribuiamo risponde a criteri rigorosi di qualità e
              affidabilità, selezionato direttamente dai migliori produttori italiani ed europei.
              La continuità della famiglia Mirigliani nel guidare l'azienda è garanzia
              di un rapporto umano e professionale con ogni cliente.
            </p>
          </div>
        </div>
      </section>

      {/* Sezione valori — 3 card */}
      <section className="bg-white border-y border-[#E5E0D8] py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E] text-center mb-12">
            I nostri valori
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Qualità */}
            <div className="flex flex-col gap-4 p-8 border border-[#E5E0D8]">
              <div className="w-8 h-px bg-[#C9A96E]" />
              <h3 className="font-serif text-2xl text-[#031634]">
                {t('ourStory.value1Title')}
              </h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                {t('ourStory.value1Desc')}
              </p>
            </div>

            {/* Tradizione */}
            <div className="flex flex-col gap-4 p-8 border border-[#E5E0D8]">
              <div className="w-8 h-px bg-[#C9A96E]" />
              <h3 className="font-serif text-2xl text-[#031634]">
                {t('ourStory.value2Title')}
              </h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                {t('ourStory.value2Desc')}
              </p>
            </div>

            {/* Servizio */}
            <div className="flex flex-col gap-4 p-8 border border-[#E5E0D8]">
              <div className="w-8 h-px bg-[#C9A96E]" />
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
              <p className="text-[#6B7280] text-sm">Via Roma 12, 09020 Villamar (SU)</p>
              <p className="text-[#6B7280] text-sm">+39 070 930 1234</p>
            </div>

            {/* Sassari */}
            <div className="flex flex-col items-center text-center py-10 px-6">
              <h4 className="font-serif text-2xl text-[#031634] mb-2">Sassari</h4>
              <p className="text-[#6B7280] text-sm">Via Sassari 45, 07100 Sassari (SS)</p>
              <p className="text-[#6B7280] text-sm">+39 079 123 4567</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
