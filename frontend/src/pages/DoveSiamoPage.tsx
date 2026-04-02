import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import ContactForm from '../components/ContactForm'

// Fix Leaflet default icon in Vite
function useLeafletIconFix() {
  useEffect(() => {
    ;(
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
        ._getIconUrl
    )
    L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
  }, [])
}

const VILLAMAR: [number, number] = [39.6189, 9.0003]
const SASSARI: [number, number] = [40.7259, 8.5558]

export default function DoveSiamoPage() {
  const { t } = useTranslation()
  useLeafletIconFix()

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Page header */}
      <div className="pt-24 pb-10 px-6 md:px-12 lg:px-20 border-b border-[#E5E0D8]">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#C9A96E] mb-3">
          {t('nav.whereWeAre')}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[#031634] leading-tight">
          {t('whereWeAre.title')}
        </h1>
        <p className="mt-3 text-[#6B7280] text-base max-w-2xl">
          {t('whereWeAre.subtitle')}
        </p>
      </div>

      {/* Due card sedi */}
      <section className="px-6 md:px-12 lg:px-20 py-14">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Villamar */}
          <div className="bg-white border border-[#E5E0D8] overflow-hidden">
            {/* Mappa */}
            <div className="h-56 w-full">
              <MapContainer
                center={VILLAMAR}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={VILLAMAR}>
                  <Popup>Mirigliani — Sede di Villamar</Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="w-6 h-px bg-[#C9A96E] mb-4" />
              <h2 className="font-serif text-2xl text-[#031634] mb-4">
                {t('whereWeAre.villamar')}
              </h2>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">Indirizzo</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.villamarAddress')}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">Telefono</dt>
                  <dd>
                    <a
                      href={`tel:${t('whereWeAre.villamarPhone').replace(/\s/g, '')}`}
                      className="text-[#031634] hover:text-[#C9A96E] transition-colors"
                    >
                      {t('whereWeAre.villamarPhone')}
                    </a>
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">Orari</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.villamarHours')}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Sassari */}
          <div className="bg-white border border-[#E5E0D8] overflow-hidden">
            {/* Mappa */}
            <div className="h-56 w-full">
              <MapContainer
                center={SASSARI}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={SASSARI}>
                  <Popup>Mirigliani — Sede di Sassari</Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="w-6 h-px bg-[#C9A96E] mb-4" />
              <h2 className="font-serif text-2xl text-[#031634] mb-4">
                {t('whereWeAre.sassari')}
              </h2>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">Indirizzo</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.sassariAddress')}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">Telefono</dt>
                  <dd>
                    <a
                      href={`tel:${t('whereWeAre.sassariPhone').replace(/\s/g, '')}`}
                      className="text-[#031634] hover:text-[#C9A96E] transition-colors"
                    >
                      {t('whereWeAre.sassariPhone')}
                    </a>
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">Orari</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.sassariHours')}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Form di contatto */}
      <section className="px-6 md:px-12 lg:px-20 pb-20 bg-white border-t border-[#E5E0D8]">
        <div className="max-w-3xl mx-auto pt-14">
          <div className="mb-8">
            <div className="w-8 h-px bg-[#C9A96E] mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl text-[#031634]">
              {t('whereWeAre.contactTitle')}
            </h2>
          </div>
          <ContactForm />
        </div>
      </section>
    </div>
  )
}
