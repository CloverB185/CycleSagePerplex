'use client'

import { useAuth } from '@/components/AuthProvider'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import QuickActionCard from '@/components/QuickActionCard'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'
import {
  ClipboardList,
  AlertTriangle,
  CalendarClock,
  MapPin,
  FileText,
  HardHat,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
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

      const reportItems: ActivityItem[] = reports.slice(0, 8).map((r) => ({
        id: r.id,
        type: 'report' as const,
        title: `Daily Report — ${new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`,
        subtitle: r.workSummary.length > 60 ? r.workSummary.slice(0, 60) + '...' : r.workSummary,
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
  const todayStr = today.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })

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
    <div className="space-y-4 animate-fade-in pb-8 px-4 pt-4">
      {/* Hero Card — mobile-optimized */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 rounded-2xl p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-5 h-5 text-construction-400 flex-shrink-0" />
              <span className="text-mobile-sm font-medium text-brand-200">{greeting}</span>
            </div>
            <h1 className="text-mobile-2xl font-bold truncate">{firstName}</h1>
            <p className="text-mobile-sm text-brand-300 mt-0.5">{todayStr}</p>
          </div>

          {/* Report status badge */}
          {stats.todayReport === 'submitted' ? (
            <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 rounded-xl px-2.5 py-1.5 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-mobile-xs font-bold text-green-300">Done</span>
            </div>
          ) : stats.todayReport === 'draft' ? (
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 rounded-xl px-2.5 py-1.5 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-mobile-xs font-bold text-amber-300">Draft</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-construction-500/20 border border-construction-400/30 rounded-xl px-2.5 py-1.5 flex-shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-construction-400 animate-pulse" />
              <span className="text-mobile-xs font-bold text-construction-300">Pending</span>
            </div>
          )}
        </div>

        {/* Site bar */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <MapPin className="w-3.5 h-3.5 text-brand-300 flex-shrink-0" />
          <span className="text-mobile-sm text-brand-200 truncate">{site.name}</span>
        </div>
      </div>

      {/* Stats Strip — 4 columns, compact */}
      {dataLoading ? (
        <LoadingSkeleton lines={1} />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: stats.totalReports, label: 'Reports', color: 'text-brand-600' },
            { value: stats.openSnags, label: 'Open', color: stats.openSnags > 0 ? 'text-safety-red' : 'text-safety-green' },
            { value: stats.inProgressSnags, label: 'In Prog', color: stats.inProgressSnags > 0 ? 'text-safety-amber' : 'text-site-400' },
            { value: stats.tomorrowPlans, label: 'Plans', color: 'text-purple-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-site-100 shadow-card py-3 px-2 text-center">
              <p className={clsx('text-mobile-xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-site-500 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions — 120px cards */}
      <div className="space-y-3">
        <h2 className="text-mobile-xs font-bold text-site-500 uppercase tracking-widest px-1">
          Quick Actions
        </h2>
        <div className="grid gap-3">
          <QuickActionCard
            icon={ClipboardList}
            title="Today's Report"
            subtitle={
              stats.todayReport === 'submitted'
                ? 'Submitted — view or add evidence'
                : stats.todayReport === 'draft'
                ? 'Draft saved — continue editing'
                : 'Record what happened today'
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
        <div className="flex items-center justify-between px-1">
          <h2 className="text-mobile-xs font-bold text-site-500 uppercase tracking-widest">
            Recent Activity
          </h2>
          {activity.length > 0 && <TrendingUp className="w-4 h-4 text-site-400" />}
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
                className="w-full text-left bg-white rounded-xl border border-site-100 shadow-card p-3 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    item.type === 'report' ? 'bg-brand-50' : 'bg-construction-50'
                  )}>
                    {item.type === 'report' ? (
                      <FileText className="w-5 h-5 text-brand-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-construction-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-mobile-sm font-semibold text-site-800 truncate">{item.title}</h3>
                      <span className={clsx(
                        'flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                        item.status === 'submitted' && 'bg-brand-100 text-brand-700',
                        item.status === 'draft' && 'bg-site-100 text-site-600',
                        item.status === 'open' && 'bg-red-100 text-red-800',
                        item.status === 'in_progress' && 'bg-amber-100 text-amber-800',
                        item.status === 'closed' && 'bg-green-100 text-green-800',
                      )}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-mobile-xs text-site-500 truncate mt-0.5">{item.subtitle}</p>
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
