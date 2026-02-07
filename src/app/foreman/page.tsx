'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SiteSelector from '@/components/SiteSelector'

type Site = { id: string; name: string; isTestSite: boolean }

export default function ForemanDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [site, setSite] = useState<Site | null>(null)
  const [stats, setStats] = useState({ reports: 0, openSnags: 0, pendingPlans: 0 })

  useEffect(() => {
    if (!site) return
    // Fetch quick stats
    Promise.all([
      fetch(`/api/daily-reports?siteId=${site.id}`).then((r) => r.json()),
      fetch(`/api/snags?siteId=${site.id}&status=open`).then((r) => r.json()),
      fetch(`/api/tomorrow-plans?siteId=${site.id}`).then((r) => r.json()),
    ]).then(([reports, snags, plans]) => {
      setStats({
        reports: reports.reports?.length || 0,
        openSnags: snags.snags?.length || 0,
        pendingPlans: plans.plans?.length || 0,
      })
    })
  }, [site])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">
          Hey, {user?.displayName?.split(' ')[0]}
        </h1>
        <div className="w-48">
          <SiteSelector selectedSiteId={site?.id || null} onSelect={setSite} />
        </div>
      </div>

      {site?.isTestSite && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium">
          TEST MODE — This is a test site. Data will not affect production.
        </div>
      )}

      {/* Quick action cards — max 3 decisions per screen */}
      <div className="grid gap-3">
        <button
          onClick={() => router.push(`/foreman/daily-report?siteId=${site?.id}&date=${today}`)}
          className="card text-left hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Daily Report</h2>
              <p className="text-sm text-gray-500">Record what happened today</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-brand-600">{stats.reports}</span>
              <p className="text-xs text-gray-400">reports</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/foreman/snags?siteId=${site?.id}`)}
          className="card text-left hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Snags</h2>
              <p className="text-sm text-gray-500">Issues requiring attention</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${stats.openSnags > 0 ? 'text-safety-red' : 'text-safety-green'}`}>
                {stats.openSnags}
              </span>
              <p className="text-xs text-gray-400">open</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/foreman/tomorrow-plan?siteId=${site?.id}`)}
          className="card text-left hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Tomorrow Plan</h2>
              <p className="text-sm text-gray-500">What&apos;s planned for tomorrow</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-brand-600">{stats.pendingPlans}</span>
              <p className="text-xs text-gray-400">plans</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
