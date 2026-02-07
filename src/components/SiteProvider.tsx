'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

type Site = {
  id: string
  name: string
  isTestSite: boolean
  address?: string
}

type SiteContextType = {
  site: Site | null
  sites: Site[]
  loading: boolean
  selectSite: (site: Site) => void
}

const SiteContext = createContext<SiteContextType>({
  site: null,
  sites: [],
  loading: true,
  selectSite: () => {},
})

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<Site | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => {
        const allSites = data.sites || []
        setSites(allSites)
        // Restore last selected or pick first
        const lastId = typeof window !== 'undefined' ? localStorage.getItem('selectedSiteId') : null
        const restored = allSites.find((s: Site) => s.id === lastId)
        if (restored) setSite(restored)
        else if (allSites.length > 0) setSite(allSites[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectSite = useCallback((s: Site) => {
    setSite(s)
    if (typeof window !== 'undefined') localStorage.setItem('selectedSiteId', s.id)
  }, [])

  return (
    <SiteContext.Provider value={{ site, sites, loading, selectSite }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  return useContext(SiteContext)
}
