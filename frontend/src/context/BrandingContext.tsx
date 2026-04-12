import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface BrandingContextValue {
  logoUrl: string | null
  images: Record<string, string | null>
  refresh: () => void
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: null,
  images: {},
  refresh: () => {},
})

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [images, setImages] = useState<Record<string, string | null>>({})

  const refresh = useCallback(() => {
    const ts = Date.now()

    fetch('/api/public/branding/logo')
      .then((r) => r.json())
      .then((data: { url: string | null }) =>
        setLogoUrl(data.url ? `${data.url}?t=${ts}` : null)
      )
      .catch(() => setLogoUrl(null))

    fetch('/api/public/branding/images')
      .then((r) => r.json())
      .then((data: { images: Record<string, string | null> }) => {
        setImages(
          Object.fromEntries(
            Object.entries(data.images).map(([slot, url]) => [
              slot,
              url ? `${url}?t=${ts}` : null,
            ])
          )
        )
      })
      .catch(() => setImages({}))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <BrandingContext.Provider value={{ logoUrl, images, refresh }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
