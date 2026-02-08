'use client'

import { useEffect, useState } from 'react'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  BarChart3,
  FileText,
  AlertTriangle,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'

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
  const router = useRouter()
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
    <div className="space-y-4 animate-fade-in pb-8 px-4 pt-4">
      {/* Hero Header — PM blue gradient */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 rounded-2xl p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-brand-200 flex-shrink-0" />
              <span className="text-mobile-sm font-medium text-brand-200">Project Manager</span>
            </div>
            <h1 className="text-mobile-2xl font-bold">Site Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <MapPin className="w-3.5 h-3.5 text-brand-300 flex-shrink-0" />
          <span className="text-mobile-sm text-brand-200 truncate">{site.name}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-mobile-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-mobile-xl font-bold text-brand-600">{submittedReports}</p>
              <p className="text-mobile-xs text-site-500 mt-0.5">Submitted Reports</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-mobile-xl font-bold text-amber-500">{draftReports}</p>
              <p className="text-mobile-xs text-site-500 mt-0.5">Draft Reports</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className={clsx('w-4 h-4', openSnags > 0 ? 'text-safety-red' : 'text-safety-green')} />
              </div>
              <p className={clsx('text-mobile-xl font-bold', openSnags > 0 ? 'text-safety-red' : 'text-safety-green')}>
                {openSnags}
              </p>
              <p className="text-mobile-xs text-site-500 mt-0.5">Open Snags</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-safety-green" />
              </div>
              <p className="text-mobile-xl font-bold text-safety-green">{closedSnags}</p>
              <p className="text-mobile-xs text-site-500 mt-0.5">Closed Snags</p>
            </div>
          </div>

          {/* Quick Access */}
          <div className="space-y-3">
            <h2 className="section-header px-1">Quick Access</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/pm/reports')}
                className="card-interactive flex flex-col items-center gap-2 py-5"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-600" />
                </div>
                <span className="text-mobile-sm font-semibold text-site-700">Reports</span>
                <span className="text-mobile-xs text-site-400">{reports.length} total</span>
              </button>
              <button
                onClick={() => router.push('/pm/snags')}
                className="card-interactive flex flex-col items-center gap-2 py-5"
              >
                <div className={clsx(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  openSnags > 0 ? 'bg-red-50' : 'bg-green-50'
                )}>
                  <AlertTriangle className={clsx('w-6 h-6', openSnags > 0 ? 'text-safety-red' : 'text-safety-green')} />
                </div>
                <span className="text-mobile-sm font-semibold text-site-700">Snags</span>
                <span className="text-mobile-xs text-site-400">{openSnags} open</span>
              </button>
            </div>
          </div>

          {/* Snag Resolution Progress */}
          {totalSnags > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-site-400" />
                  <h2 className="text-mobile-sm font-semibold text-site-600">Snag Resolution Rate</h2>
                </div>
                <span className="text-mobile-sm font-bold text-site-700">{resolutionRate}%</span>
              </div>
              <div className="w-full bg-site-200 rounded-full h-3">
                <div
                  className={clsx(
                    'h-3 rounded-full transition-all duration-500',
                    resolutionRate >= 75 ? 'bg-safety-green' :
                    resolutionRate >= 40 ? 'bg-safety-amber' :
                    'bg-safety-red'
                  )}
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <p className="text-mobile-xs text-site-400 mt-2">
                {closedSnags} of {totalSnags} snags resolved
              </p>
            </div>
          )}

          {/* Recent Reports */}
          <div className="space-y-3">
            <h2 className="section-header px-1">
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
                  <button
                    key={r.id}
                    onClick={() => router.push('/pm/reports')}
                    className="card w-full text-left hover:border-brand-200 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-mobile-sm font-medium text-site-800">
                            {new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className={`badge badge-${r.status}`}>{r.status}</span>
                        </div>
                        <p className="text-mobile-xs text-site-500 mt-0.5">
                          by {r.createdBy.displayName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-mobile-xs text-site-400 flex-shrink-0">
                        {r.evidence.length > 0 && (
                          <span>{r.evidence.length} evidence</span>
                        )}
                        {r._count.annotations > 0 && (
                          <span>{r._count.annotations} notes</span>
                        )}
                      </div>
                    </div>
                    <p className="text-mobile-sm text-site-600 mt-1.5 line-clamp-2">{r.workSummary}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Urgent Snags */}
          <div className="space-y-3">
            <h2 className="section-header px-1">
              Urgent Snags
              {urgentSnags.length > 0 && (
                <span className="ml-2 text-mobile-xs font-normal text-site-400">
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
                  <button
                    key={s.id}
                    onClick={() => router.push('/pm/snags')}
                    className={clsx(
                      'card w-full text-left active:scale-[0.98] transition-all',
                      s.category === 'safety'
                        ? 'border-red-200 bg-red-50/50'
                        : 'hover:border-brand-200'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-mobile-sm font-medium text-site-800 truncate">{s.title}</h3>
                          {s.category === 'safety' && (
                            <span className="text-mobile-xs font-bold text-red-600 uppercase flex-shrink-0">URGENT</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`badge-${s.category}`}>{s.category}</span>
                          <span className="text-mobile-xs text-site-400">
                            {s.owner.displayName}
                          </span>
                        </div>
                      </div>
                      <span className="text-mobile-xs text-site-400 flex-shrink-0 mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
