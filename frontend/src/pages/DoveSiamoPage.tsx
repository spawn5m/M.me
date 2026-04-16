import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import ContactForm from '../components/ContactForm'
import { fetchPublicMaps } from '../lib/api/maps'

interface MapOffice {
  lat: number
  lng: number
}

interface PublicMapsState {
  offices: {
    villamar: MapOffice
    sassari: MapOffice
  }
}

const DEFAULT_MAPS: PublicMapsState = {
  offices: {
    villamar: { lat: 39.6189, lng: 9.0003 },
    sassari: { lat: 40.7259, lng: 8.5558 },
  },
}

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

function buildGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
}

function buildAppleMapsUrl(label: string, lat: number, lng: number) {
  return `https://maps.apple.com/?ll=${encodeURIComponent(`${lat},${lng}`)}&q=${encodeURIComponent(label)}`
}

function buildOpenStreetMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(lat))}&mlon=${encodeURIComponent(String(lng))}#map=16/${lat}/${lng}`
}

function LinkIcon({ kind }: { kind: 'apple' | 'google' | 'osm' }) {
  if (kind === 'apple') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.7 13.1c0-2 1.6-3 1.7-3.1-0.9-1.3-2.4-1.5-2.9-1.5-1.3-0.1-2.5 0.8-3.1 0.8-0.6 0-1.6-0.8-2.6-0.8-1.3 0-2.6 0.8-3.3 2.1-1.4 2.4-0.3 5.9 1 7.8 0.7 0.9 1.4 2 2.4 1.9 1 0 1.4-0.6 2.6-0.6 1.2 0 1.6 0.6 2.6 0.6 1 0 1.7-0.9 2.4-1.8 0.8-1.1 1.1-2.2 1.1-2.3-0.1 0-2.8-1.1-2.9-4.1zM15.2 7.4c0.6-0.7 1-1.6 0.9-2.4-0.8 0-1.8 0.5-2.4 1.2-0.5 0.6-1 1.5-0.9 2.4 0.9 0.1 1.8-0.5 2.4-1.2z" />
      </svg>
    )
  }

  if (kind === 'google') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.1-.9 2.1-1.9 2.8v2.3h3c1.8-1.6 3.1-4 3.1-6.9z" />
        <path fill="#34A853" d="M12 22c2.6 0 4.8-.9 6.3-2.5l-3-2.3c-.8.5-1.8.8-3.3.8-2.5 0-4.6-1.7-5.4-4H3.4v2.4C4.9 19.8 8.2 22 12 22z" />
        <path fill="#FBBC05" d="M6.6 13c-.2-.7-.3-1.3-.3-2s.1-1.3.3-2V6.6H3.4C2.8 8.1 2.5 9.9 2.5 11.8S2.8 15.5 3.4 17l3.2-2.4z" />
        <path fill="#EA4335" d="M12 4.8c1.5 0 2.9.5 4 1.5l3-3C16.8 1.8 14.6 1 12 1 8.2 1 4.9 3.2 3.4 6.6l3.2 2.4c.8-2.3 2.9-4.2 5.4-4.2z" />
      </svg>
    )
  }

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C7 2 3 6 3 11c0 4.1 2.7 7.7 6.6 8.9L10 22l1.1-2.5c.3.1.6.1.9.1 5 0 9-4 9-9s-4-9-9-9zm0 15c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
    </svg>
  )
}

export default function DoveSiamoPage() {
  const { t } = useTranslation()
  const [maps, setMaps] = useState<PublicMapsState>(DEFAULT_MAPS)
  useLeafletIconFix()

  useEffect(() => {
    let isMounted = true
    fetchPublicMaps()
      .then((res) => {
        if (isMounted) setMaps(res.data)
      })
      .catch(() => {
        if (isMounted) setMaps(DEFAULT_MAPS)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const villamarPosition: [number, number] = [maps.offices.villamar.lat, maps.offices.villamar.lng]
  const sassariPosition: [number, number] = [maps.offices.sassari.lat, maps.offices.sassari.lng]

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
                key={`villamar-${villamarPosition[0]}-${villamarPosition[1]}`}
                center={villamarPosition}
                zoom={18}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={villamarPosition}>
                  <Popup>{t('whereWeAre.popupVillamar')}</Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[#E5E0D8] px-6 py-4">
              <a aria-label={t('whereWeAre.mapApple')} title={t('whereWeAre.mapApple')} href={buildAppleMapsUrl(t('whereWeAre.villamar'), maps.offices.villamar.lat, maps.offices.villamar.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center border border-[#E5E0D8] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2">
                <LinkIcon kind="apple" />
              </a>
              <a aria-label={t('whereWeAre.mapGoogle')} title={t('whereWeAre.mapGoogle')} href={buildGoogleMapsUrl(maps.offices.villamar.lat, maps.offices.villamar.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center border border-[#E5E0D8] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2">
                <LinkIcon kind="google" />
              </a>
              <a aria-label={t('whereWeAre.mapOpenStreetMap')} title={t('whereWeAre.mapOpenStreetMap')} href={buildOpenStreetMapUrl(maps.offices.villamar.lat, maps.offices.villamar.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center border border-[#E5E0D8] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2">
                <LinkIcon kind="osm" />
              </a>
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="w-6 h-px bg-[#C9A96E] mb-4" />
              <h2 className="font-serif text-2xl text-[#031634] mb-4">
                {t('whereWeAre.villamar')}
              </h2>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">{t('whereWeAre.labelAddress')}</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.villamarAddress')}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">{t('whereWeAre.labelPhone')}</dt>
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
                  <dt className="text-[#6B7280] min-w-[70px]">{t('whereWeAre.labelHours')}</dt>
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
                key={`sassari-${sassariPosition[0]}-${sassariPosition[1]}`}
                center={sassariPosition}
                zoom={18}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={sassariPosition}>
                  <Popup>{t('whereWeAre.popupSassari')}</Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[#E5E0D8] px-6 py-4">
              <a aria-label={t('whereWeAre.mapApple')} title={t('whereWeAre.mapApple')} href={buildAppleMapsUrl(t('whereWeAre.sassari'), maps.offices.sassari.lat, maps.offices.sassari.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center border border-[#E5E0D8] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2">
                <LinkIcon kind="apple" />
              </a>
              <a aria-label={t('whereWeAre.mapGoogle')} title={t('whereWeAre.mapGoogle')} href={buildGoogleMapsUrl(maps.offices.sassari.lat, maps.offices.sassari.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center border border-[#E5E0D8] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2">
                <LinkIcon kind="google" />
              </a>
              <a aria-label={t('whereWeAre.mapOpenStreetMap')} title={t('whereWeAre.mapOpenStreetMap')} href={buildOpenStreetMapUrl(maps.offices.sassari.lat, maps.offices.sassari.lng)} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center border border-[#E5E0D8] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] focus-visible:ring-offset-2">
                <LinkIcon kind="osm" />
              </a>
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="w-6 h-px bg-[#C9A96E] mb-4" />
              <h2 className="font-serif text-2xl text-[#031634] mb-4">
                {t('whereWeAre.sassari')}
              </h2>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">{t('whereWeAre.labelAddress')}</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.sassariAddress')}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="text-[#6B7280] min-w-[70px]">{t('whereWeAre.labelPhone')}</dt>
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
                  <dt className="text-[#6B7280] min-w-[70px]">{t('whereWeAre.labelHours')}</dt>
                  <dd className="text-[#1A1A1A]">{t('whereWeAre.sassariHours')}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Form di contatto */}
      <section className="px-6 md:px-12 lg:px-20 pb-20 bg-white border-t border-[#E5E0D8]">
        <div className="max-w-7xl mx-auto pt-14 grid grid-cols-1 md:grid-cols-2 gap-16">

          {/* Sinistra — Orari di ritiro */}
          <div className="flex flex-col">
            <div className="w-8 h-px bg-[#C9A96E] mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl text-[#031634] mb-8">
              {t('whereWeAre.pickupTitle')}
            </h2>
            <div className="flex flex-col gap-8">

              {/* Villamar */}
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#C9A96E] mb-4">
                  {t('whereWeAre.pickupVillamar')}
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { labelKey: 'labelWeekdays', key: 'pickupVillamarWeekdays' },
                    { labelKey: 'labelSaturday', key: 'pickupVillamarSaturday' },
                    { labelKey: 'labelSunday',   key: 'pickupVillamarSunday' },
                  ].map(({ labelKey, key }) => (
                    <div key={key} className="flex items-baseline gap-2 text-sm">
                      <span className="text-[#1A1A1A] w-24 shrink-0">{t(`whereWeAre.${labelKey}`)}</span>
                      <span className="flex-1 border-b border-dotted border-[#E5E0D8] mb-1" />
                      <span className="text-[#6B7280] tabular-nums">{t(`whereWeAre.${key}`)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full h-px bg-[#E5E0D8]" />

              {/* Sassari */}
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#C9A96E] mb-4">
                  {t('whereWeAre.pickupSassari')}
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { labelKey: 'labelWeekdays', key: 'pickupSassariWeekdays' },
                    { labelKey: 'labelSaturday', key: 'pickupSassariSaturday' },
                    { labelKey: 'labelSunday',   key: 'pickupSassariSunday' },
                  ].map(({ labelKey, key }) => (
                    <div key={key} className="flex items-baseline gap-2 text-sm">
                      <span className="text-[#1A1A1A] w-24 shrink-0">{t(`whereWeAre.${labelKey}`)}</span>
                      <span className="flex-1 border-b border-dotted border-[#E5E0D8] mb-1" />
                      <span className="text-[#6B7280] tabular-nums">{t(`whereWeAre.${key}`)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Destra — Form dentro card */}
          <div className="flex flex-col">
            <div className="w-8 h-px bg-[#C9A96E] mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl text-[#031634] mb-8">
              {t('whereWeAre.contactTitle')}
            </h2>
            <div className="group flex-1 bg-[#FAF9F6] border border-[#E5E0D8] p-8 hover:border-[#C9A96E] hover:shadow-[0_4px_24px_rgba(201,169,110,0.10)] hover:scale-[1.01] transition-all duration-200">
              <div className="w-8 h-px bg-[#C9A96E] mb-6 group-hover:w-full transition-all duration-300" />
              <ContactForm />
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
