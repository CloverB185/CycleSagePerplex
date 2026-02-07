'use client'

import { useEffect, useState } from 'react'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

type Report = {
  id: string
  reportDate: string
  status: string
  workSummary: string
  createdBy: { id: string; displayName: string }
  evidence: Array<{ id: string }>
  _count: { annotations: number }
}

type Snag = {
  id: string
  title: string
  category: string
  status: string
  owner: { id: string; displayName: string }
  createdAt: string
}

export default function PMDashboard() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!site) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/daily-reports?siteId=${site.id}`).then((r) => r.json()),
      fetch(`/api/snags?siteId=${site.id}`).then((r) => r.json()),
    ])
      .then(([reportData, snagData]) => {
        setReports(reportData.reports || [])
        setSnags(snagData.snags || [])
      })
      .catch(() => {
        setError('Failed to load site data')
        toast('Failed to load site data', 'error')
      })
      .finally(() => setLoading(false))
  }, [site]) // eslint-disable-line react-hooks/exhaustive-deps

  const submittedReports = reports.filter((r) => r.status === 'submitted').length
  const draftReports = reports.filter((r) => r.status === 'draft').length
  const openSnags = snags.filter((s) => s.status === 'open').length
  const closedSnags = snags.filter((s) => s.status === 'closed').length
  const totalSnags = snags.length
  const resolutionRate = totalSnags > 0 ? Math.round((closedSnags / totalSnags) * 100) : 0

  const urgentSnags = snags
    .filter((s) => s.status === 'open')
    .sort((a, b) => {
      // Safety snags first
      if (a.category === 'safety' && b.category !== 'safety') return -1
      if (a.category !== 'safety' && b.category === 'safety') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  if (siteLoading) {
    return <LoadingSkeleton lines={4} />
  }

  if (!site) {
    return (
      <EmptyState
        icon="search"
        title="No site selected"
        description="Select a site from the navigation bar to view the dashboard."
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Site Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{site.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton lines={4} />
      ) : (
        <>
          {/* Stats 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card">
              <p className="text-3xl font-bold text-brand-600">{submittedReports}</p>
              <p className="text-sm text-gray-500 mt-1">Submitted Reports</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-amber-500">{draftReports}</p>
              <p className="text-sm text-gray-500 mt-1">Draft Reports</p>
            </div>
            <div className="stat-card">
              <p className={`text-3xl font-bold ${openSnags > 0 ? 'text-safety-red' : 'text-safety-green'}`}>
                {openSnags}
              </p>
              <p className="text-sm text-gray-500 mt-1">Open Snags</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-safety-green">{closedSnags}</p>
              <p className="text-sm text-gray-500 mt-1">Closed Snags</p>
            </div>
          </div>

          {/* Snag Resolution Progress */}
          {totalSnags > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-600">Snag Resolution Rate</h2>
                <span className="text-sm font-bold text-gray-700">{resolutionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    resolutionRate >= 75 ? 'bg-green-500' :
                    resolutionRate >= 40 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {closedSnags} of {totalSnags} snags resolved
              </p>
            </div>
          )}

          {/* Recent Reports (last 5) */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Recent Reports
            </h2>
            {reports.length === 0 ? (
              <EmptyState
                icon="report"
                title="No reports yet"
                description="Reports from foremen will appear here once submitted."
              />
            ) : (
              <div className="space-y-2">
                {reports.slice(0, 5).map((r) => (
                  <div key={r.id} className="card hover:border-brand-200 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className={`badge badge-${r.status}`}>{r.status}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          by {r.createdBy.displayName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                        {r.evidence.length > 0 && (
                          <span>{r.evidence.length} evidence</span>
                        )}
                        {r._count.annotations > 0 && (
                          <span>{r._count.annotations} notes</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{r.workSummary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgent Snags */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Urgent Snags
              {urgentSnags.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({urgentSnags.length} open)
                </span>
              )}
            </h2>
            {urgentSnags.length === 0 ? (
              <EmptyState
                icon="snag"
                title="No open snags"
                description="All snags have been addressed."
              />
            ) : (
              <div className="space-y-2">
                {urgentSnags.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className={`card transition-colors ${
                      s.category === 'safety'
                        ? 'border-red-200 bg-red-50/50'
                        : 'hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-800 truncate">{s.title}</h3>
                          {s.category === 'safety' && (
                            <span className="text-xs font-bold text-red-600 uppercase">URGENT</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge-${s.category}`}>{s.category}</span>
                          <span className="text-xs text-gray-400">
                            Assigned to {s.owner.displayName}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
