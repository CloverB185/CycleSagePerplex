'use client'

import { useAuth } from '@/components/AuthProvider'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

type ReportSummary = {
  id: string
  reportDate: string
  status: string
  workSummary: string
  createdAt?: string
}

type SnagSummary = {
  id: string
  title: string
  status: string
  category: string
  createdAt: string
}

type PlanSummary = {
  id: string
  planDate: string
  tasks: string
}

type ActivityItem = {
  id: string
  type: 'report' | 'snag'
  title: string
  subtitle: string
  date: string
  status: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ForemanDashboard() {
  const { user } = useAuth()
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({
    totalReports: 0,
    openSnags: 0,
    inProgressSnags: 0,
    tomorrowPlans: 0,
  })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    if (!site) return
    setDataLoading(true)
    try {
      const [reportsRes, allSnagsRes, openSnagsRes, ipSnagsRes, plansRes] = await Promise.all([
        fetch(`/api/daily-reports?siteId=${site.id}`).then((r) => r.json()),
        fetch(`/api/snags?siteId=${site.id}`).then((r) => r.json()),
        fetch(`/api/snags?siteId=${site.id}&status=open`).then((r) => r.json()),
        fetch(`/api/snags?siteId=${site.id}&status=in_progress`).then((r) => r.json()),
        fetch(`/api/tomorrow-plans?siteId=${site.id}`).then((r) => r.json()),
      ])

      const reports: ReportSummary[] = reportsRes.reports || []
      const allSnags: SnagSummary[] = allSnagsRes.snags || []
      const openSnags: SnagSummary[] = openSnagsRes.snags || []
      const ipSnags: SnagSummary[] = ipSnagsRes.snags || []
      const plans: PlanSummary[] = plansRes.plans || []

      setStats({
        totalReports: reports.length,
        openSnags: openSnags.length,
        inProgressSnags: ipSnags.length,
        tomorrowPlans: plans.length,
      })

      // Build recent activity feed: last 5 items from reports + snags, sorted by date
      const reportItems: ActivityItem[] = reports.slice(0, 10).map((r) => ({
        id: r.id,
        type: 'report' as const,
        title: `Daily Report - ${new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`,
        subtitle: r.workSummary.length > 80 ? r.workSummary.slice(0, 80) + '...' : r.workSummary,
        date: r.reportDate,
        status: r.status,
      }))

      const snagItems: ActivityItem[] = allSnags.slice(0, 10).map((s) => ({
        id: s.id,
        type: 'snag' as const,
        title: s.title,
        subtitle: `${s.category} snag`,
        date: s.createdAt,
        status: s.status,
      }))

      const combined = [...reportItems, ...snagItems]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)

      setActivity(combined)
    } catch {
      toast('Failed to load dashboard data', 'error')
    } finally {
      setDataLoading(false)
    }
  }, [site, toast])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const firstName = user?.displayName?.split(' ')[0] || 'Foreman'
  const greeting = getGreeting()
  const today = new Date().toISOString().split('T')[0]

  // While site context is loading
  if (siteLoading) {
    return <LoadingSkeleton lines={4} />
  }

  // No site selected
  if (!site) {
    return (
      <EmptyState
        icon="report"
        title="No site selected"
        description="Select a site from the navigation bar to get started."
      />
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting + Site Info */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">
          {greeting}, {firstName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <span className="text-sm font-medium text-gray-600">{site.name}</span>
            {site.address && (
              <span className="text-sm text-gray-400 ml-2">{site.address}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards - 2x2 Grid */}
      {dataLoading ? (
        <LoadingSkeleton lines={2} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <p className="text-2xl font-bold text-brand-600">{stats.totalReports}</p>
            <p className="text-xs text-gray-500 mt-1">Total Reports</p>
          </div>
          <div className="stat-card">
            <p className={`text-2xl font-bold ${stats.openSnags > 0 ? 'text-safety-red' : 'text-safety-green'}`}>
              {stats.openSnags}
            </p>
            <p className="text-xs text-gray-500 mt-1">Open Snags</p>
          </div>
          <div className="stat-card">
            <p className={`text-2xl font-bold ${stats.inProgressSnags > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
              {stats.inProgressSnags}
            </p>
            <p className="text-xs text-gray-500 mt-1">In-Progress Snags</p>
          </div>
          <div className="stat-card">
            <p className="text-2xl font-bold text-brand-600">{stats.tomorrowPlans}</p>
            <p className="text-xs text-gray-500 mt-1">Tomorrow Plans</p>
          </div>
        </div>
      )}

      {/* Quick Action Buttons - Big, Tappable */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid gap-3">
          <button
            onClick={() => router.push('/foreman/daily-report')}
            className="card text-left hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4 py-4"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Today&apos;s Report</h3>
              <p className="text-sm text-gray-500">Record what happened today ({new Date(today + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })})</p>
            </div>
            <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/foreman/snags')}
            className="card text-left hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4 py-4"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${stats.openSnags > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <svg className={`w-6 h-6 ${stats.openSnags > 0 ? 'text-safety-red' : 'text-safety-green'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Log a Snag</h3>
              <p className="text-sm text-gray-500">
                {stats.openSnags > 0
                  ? `${stats.openSnags} open issue${stats.openSnags !== 1 ? 's' : ''} need attention`
                  : 'No open issues right now'}
              </p>
            </div>
            <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/foreman/tomorrow-plan')}
            className="card text-left hover:border-brand-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4 py-4"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Plan Tomorrow</h3>
              <p className="text-sm text-gray-500">Set up tasks for the next workday</p>
            </div>
            <svg className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Activity</h2>
        {dataLoading ? (
          <LoadingSkeleton lines={3} />
        ) : activity.length === 0 ? (
          <EmptyState
            icon="report"
            title="No activity yet"
            description="Start by creating your first daily report or logging a snag."
          />
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  if (item.type === 'report') {
                    router.push('/foreman/daily-report')
                  } else {
                    router.push('/foreman/snags')
                  }
                }}
                className="card w-full text-left hover:border-brand-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === 'report' ? 'bg-brand-50' : 'bg-amber-50'
                  }`}>
                    {item.type === 'report' ? (
                      <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-gray-800 truncate">{item.title}</h3>
                      <span className={`flex-shrink-0 ${
                        item.type === 'report'
                          ? `badge-${item.status}`
                          : `badge-${item.status.replace('_', '-')}`
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
