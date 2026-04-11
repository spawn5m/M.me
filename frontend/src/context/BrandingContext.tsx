import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface BrandingContextValue {
  logoUrl: string | null
  refresh: () => void
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: null,
  refresh: () => {},
})

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetch('/api/public/branding/logo')
      .then((r) => r.json())
      .then((data: { url: string | null }) =>
        setLogoUrl(data.url ? `${data.url}?t=${Date.now()}` : null)
      )
      .catch(() => setLogoUrl(null))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <BrandingContext.Provider value={{ logoUrl, refresh }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
