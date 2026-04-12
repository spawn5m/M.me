import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchPublicMaintenance } from '../lib/api/maintenance'
import type { MaintenanceStateMap } from '../../../backend/src/types/shared'

const DEFAULT_STATE: MaintenanceStateMap = {
  home: { enabled: false },
  ourStory: { enabled: false },
  whereWeAre: { enabled: false },
  funeralHomes: { enabled: false },
  marmistas: { enabled: false },
}

interface MaintenanceContextValue {
  pages: MaintenanceStateMap
  refresh: () => Promise<void>
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null)

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<MaintenanceStateMap>(DEFAULT_STATE)

  const refresh = async () => {
    try {
      const res = await fetchPublicMaintenance()
      setPages(res.data.pages)
    } catch {
      setPages(DEFAULT_STATE)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <MaintenanceContext.Provider value={{ pages, refresh }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenance(): MaintenanceContextValue {
  const ctx = useContext(MaintenanceContext)
  if (!ctx) throw new Error('useMaintenance deve essere usato dentro MaintenanceProvider')
  return ctx
}
