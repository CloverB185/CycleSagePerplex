'use client'

import { useAuth } from '@/components/AuthProvider'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import QuickActionCard from '@/components/QuickActionCard'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList,
  AlertTriangle,
  CalendarClock,
  MapPin,
  FileText,
  HardHat,
  TrendingUp,
} from 'lucide-react'

type ReportSummary = {
  id: string
  reportDate: string
  status: string
  workSummary: string
}

type SnagSummary = {
  id: string
  title: string
  status: string
  category: string
  createdAt: string
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
  if (hour < 6) return 'Early start'
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
    todayReport: null as string | null,
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

      const today = new Date().toISOString().split('T')[0]
      const todayReport = reports.find((r) => r.reportDate === today)

      setStats({
        totalReports: reports.length,
        openSnags: openSnags.length,
        inProgressSnags: ipSnags.length,
        tomorrowPlans: (plansRes.plans || []).length,
        todayReport: todayReport ? todayReport.status : null,
      })

      // Activity feed
      const reportItems: ActivityItem[] = reports.slice(0, 8).map((r) => ({
        id: r.id,
        type: 'report' as const,
        title: `Daily Report — ${new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`,
        subtitle: r.workSummary.length > 70 ? r.workSummary.slice(0, 70) + '...' : r.workSummary,
        date: r.reportDate,
        status: r.status,
      }))
      const snagItems: ActivityItem[] = allSnags.slice(0, 8).map((s) => ({
        id: s.id,
        type: 'snag' as const,
        title: s.title,
        subtitle: `${s.category} snag`,
        date: s.createdAt,
        status: s.status,
      }))
      setActivity(
        [...reportItems, ...snagItems]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
      )
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
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })

  if (siteLoading) return <LoadingSkeleton lines={4} />

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
    <div className="space-y-6 animate-fade-in pb-6">
      {/* Hero Greeting */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-5 h-5 text-construction-400" />
              <span className="text-sm font-medium text-brand-200">{greeting}</span>
            </div>
            <h1 className="text-2xl font-bold">{firstName}</h1>
            <p className="text-sm text-brand-200 mt-1">{todayStr}</p>
          </div>
          {stats.todayReport === 'submitted' ? (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-3 py-1.5 text-xs font-bold text-green-300 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Report Done
            </div>
          ) : stats.todayReport === 'draft' ? (
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              Draft Saved
            </div>
          ) : (
            <div className="bg-construction-500/20 border border-construction-400/30 rounded-xl px-3 py-1.5 text-xs font-bold text-construction-300 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-construction-400 animate-pulse" />
              Report Pending
            </div>
          )}
        </div>

        {/* Site info bar */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
          <MapPin className="w-4 h-4 text-brand-300" />
          <span className="text-sm text-brand-200">{site.name}</span>
          {site.address && <span className="text-xs text-brand-300 ml-1">— {site.address}</span>}
        </div>
      </div>

      {/* Stats Strip */}
      {dataLoading ? (
        <LoadingSkeleton lines={1} />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card py-3 px-2">
            <p className="text-xl font-bold text-brand-600">{stats.totalReports}</p>
            <p className="text-[10px] text-site-500 mt-0.5 font-semibold uppercase tracking-wider">Reports</p>
          </div>
          <div className="stat-card py-3 px-2">
            <p className={`text-xl font-bold ${stats.openSnags > 0 ? 'text-safety-red' : 'text-safety-green'}`}>
              {stats.openSnags}
            </p>
            <p className="text-[10px] text-site-500 mt-0.5 font-semibold uppercase tracking-wider">Open</p>
          </div>
          <div className="stat-card py-3 px-2">
            <p className={`text-xl font-bold ${stats.inProgressSnags > 0 ? 'text-safety-amber' : 'text-site-400'}`}>
              {stats.inProgressSnags}
            </p>
            <p className="text-[10px] text-site-500 mt-0.5 font-semibold uppercase tracking-wider">In Prog</p>
          </div>
          <div className="stat-card py-3 px-2">
            <p className="text-xl font-bold text-purple-600">{stats.tomorrowPlans}</p>
            <p className="text-[10px] text-site-500 mt-0.5 font-semibold uppercase tracking-wider">Plans</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="section-header">Quick Actions</h2>
        <div className="grid gap-3">
          <QuickActionCard
            icon={ClipboardList}
            title="Today's Report"
            subtitle={
              stats.todayReport === 'submitted'
                ? 'Submitted — view or add evidence'
                : stats.todayReport === 'draft'
                ? 'Draft saved — continue editing'
                : `Record what happened today`
            }
            onClick={() => router.push('/foreman/daily-report')}
            variant="orange"
            pulse={!stats.todayReport}
          />
          <QuickActionCard
            icon={AlertTriangle}
            title="Site Snags"
            subtitle={
              stats.openSnags > 0
                ? `${stats.openSnags} open issue${stats.openSnags !== 1 ? 's' : ''} need attention`
                : 'No open issues — all clear'
            }
            onClick={() => router.push('/foreman/snags')}
            variant={stats.openSnags > 0 ? 'red' : 'green'}
            badge={stats.openSnags || undefined}
            badgeColor="red"
          />
          <QuickActionCard
            icon={CalendarClock}
            title="Plan Tomorrow"
            subtitle="Set up tasks for the next workday"
            onClick={() => router.push('/foreman/tomorrow-plan')}
            variant="purple"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-header">Recent Activity</h2>
          {activity.length > 0 && (
            <TrendingUp className="w-4 h-4 text-site-400" />
          )}
        </div>
        {dataLoading ? (
          <LoadingSkeleton lines={3} />
        ) : activity.length === 0 ? (
          <EmptyState
            icon="report"
            title="No activity yet"
            description="Start by creating your first daily report."
          />
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => router.push(item.type === 'report' ? '/foreman/daily-report' : '/foreman/snags')}
                className="card-interactive w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === 'report' ? 'bg-brand-50' : 'bg-construction-50'
                  }`}>
                    {item.type === 'report' ? (
                      <FileText className="w-4 h-4 text-brand-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-construction-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-site-800 truncate">{item.title}</h3>
                      <span className={`flex-shrink-0 ${
                        item.type === 'report'
                          ? `badge-${item.status}`
                          : `badge-${item.status.replace('_', '-')}`
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-site-500 truncate">{item.subtitle}</p>
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
