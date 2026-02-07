'use client'

import { useEffect, useState } from 'react'

type Site = {
  id: string
  name: string
  isTestSite: boolean
}

type Props = {
  selectedSiteId: string | null
  onSelect: (site: Site) => void
}

export default function SiteSelector({ selectedSiteId, onSelect }: Props) {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites || [])
        // Auto-select first site if none selected
        if (!selectedSiteId && data.sites?.length > 0) {
          onSelect(data.sites[0])
        }
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-sm text-gray-400">Loading sites...</div>
  if (sites.length === 0) return <div className="text-sm text-gray-400">No sites assigned</div>

  return (
    <select
      className="input-field text-sm"
      value={selectedSiteId || ''}
      onChange={(e) => {
        const site = sites.find((s) => s.id === e.target.value)
        if (site) onSelect(site)
      }}
    >
      {sites.map((site) => (
        <option key={site.id} value={site.id}>
          {site.isTestSite ? '[TEST] ' : ''}{site.name}
        </option>
      ))}
    </select>
  )
}
