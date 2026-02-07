'use client'

import { useAuth } from '@/components/AuthProvider'
import { useEffect, useState } from 'react'
import SiteSelector from '@/components/SiteSelector'

type Site = { id: string; name: string; isTestSite: boolean }

type Report = {
  id: string
  reportDate: string
  status: string
  workSummary: string
  createdBy: { displayName: string }
  _count: { annotations: number }
  evidence: Array<{ id: string }>
}

type Snag = {
  id: string
  title: string
  category: string
  status: string
  owner: { displayName: string }
  createdAt: string
}

export default function PMDashboard() {
  const { user } = useAuth()
  const [site, setSite] = useState<Site | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!site) return
    setLoading(true)
    Promise.all([
      fetch(`/api/daily-reports?siteId=${site.id}`).then((r) => r.json()),
      fetch(`/api/snags?siteId=${site.id}`).then((r) => r.json()),
    ])
      .then(([reportData, snagData]) => {
        setReports(reportData.reports || [])
        setSnags(snagData.snags || [])
      })
      .finally(() => setLoading(false))
  }, [site])

  const openSnags = snags.filter((s) => s.status === 'open').length
  const inProgressSnags = snags.filter((s) => s.status === 'in_progress').length
  const submittedReports = reports.filter((r) => r.status === 'submitted').length
  const draftReports = reports.filter((r) => r.status === 'draft').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Site Dashboard</h1>
        <div className="w-56">
          <SiteSelector selectedSiteId={site?.id || null} onSelect={setSite} />
        </div>
      </div>

      {site?.isTestSite && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium">
          TEST MODE — Viewing test site data
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400 animate-pulse">Loading site data...</div>
      ) : site ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <p className="text-3xl font-bold text-brand-600">{submittedReports}</p>
              <p className="text-sm text-gray-500">Submitted Reports</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-amber-500">{draftReports}</p>
              <p className="text-sm text-gray-500">Draft Reports</p>
            </div>
            <div className="card text-center">
              <p className={`text-3xl font-bold ${openSnags > 0 ? 'text-safety-red' : 'text-safety-green'}`}>
                {openSnags}
              </p>
              <p className="text-sm text-gray-500">Open Snags</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-amber-500">{inProgressSnags}</p>
              <p className="text-sm text-gray-500">In Progress Snags</p>
            </div>
          </div>

          {/* Recent reports */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600">Recent Reports</h2>
            {reports.slice(0, 5).map((r) => (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{r.reportDate}</span>
                    <span className="text-sm text-gray-400 ml-2">by {r.createdBy.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.evidence.length > 0 && (
                      <span className="text-xs text-gray-400">{r.evidence.length} evidence</span>
                    )}
                    <span className={`badge-${r.status}`}>{r.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.workSummary}</p>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-sm text-gray-400 italic py-4 text-center">No reports yet</p>
            )}
          </div>

          {/* Open snags */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600">Open Snags</h2>
            {snags
              .filter((s) => s.status !== 'closed')
              .slice(0, 5)
              .map((s) => (
                <div key={s.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-700">{s.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge-${s.category}`}>{s.category}</span>
                        <span className="text-xs text-gray-400">Assigned to {s.owner.displayName}</span>
                      </div>
                    </div>
                    <span className={`badge-${s.status.replace('_', '-')}`}>{s.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            {snags.filter((s) => s.status !== 'closed').length === 0 && (
              <p className="text-sm text-gray-400 italic py-4 text-center">No open snags</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">Select a site to view dashboard</div>
      )}
    </div>
  )
}
