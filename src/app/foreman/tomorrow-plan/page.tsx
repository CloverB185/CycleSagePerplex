'use client'

import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import { useState, useEffect, useCallback, Suspense } from 'react'
import clsx from 'clsx'
import {
  CalendarClock,
  Lock,
  CheckCircle2,
  Clock,
  ClipboardList,
  Package,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'

type Plan = {
  id: string
  planDate: string
  tasks: string
  requiredResources: string | null
  knownRisks: string | null
  createdAt: string
  updatedAt: string
}

function TomorrowPlanInner() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [plan, setPlan] = useState<Plan | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'edit' | 'history'>('edit')

  const [tasks, setTasks] = useState('')
  const [requiredResources, setRequiredResources] = useState('')
  const [knownRisks, setKnownRisks] = useState('')

  const loadPlans = useCallback(async () => {
    if (!site) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tomorrow-plans?siteId=${site.id}`)
      const data = await res.json()
      const allPlans: Plan[] = data.plans || []
      setPlans(allPlans)
      const existing = allPlans.find((p) => p.planDate === tomorrowStr)
      if (existing) {
        setPlan(existing)
        setTasks(existing.tasks || '')
        setRequiredResources(existing.requiredResources || '')
        setKnownRisks(existing.knownRisks || '')
      } else {
        setPlan(null)
        setTasks('')
        setRequiredResources('')
        setKnownRisks('')
      }
    } catch {
      toast('Failed to load plans', 'error')
    } finally {
      setLoading(false)
    }
  }, [site, tomorrowStr, toast])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const save = async () => {
    if (!site || !tasks.trim()) return
    setSaving(true)
    try {
      if (plan) {
        const res = await fetch(`/api/tomorrow-plans/${plan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, requiredResources, knownRisks }),
        })
        const data = await res.json()
        if (res.ok) {
          setPlan(data.plan)
          toast('Plan updated')
        } else {
          toast(data.error || 'Failed to update', 'error')
        }
      } else {
        const res = await fetch('/api/tomorrow-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: site.id, planDate: tomorrowStr, tasks, requiredResources, knownRisks }),
        })
        const data = await res.json()
        if (res.ok) {
          setPlan(data.plan)
          toast('Plan saved')
        } else {
          toast(data.error || 'Failed to create', 'error')
        }
      }
    } catch {
      toast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (siteLoading) return <LoadingSkeleton lines={3} />

  if (!site) {
    return (
      <EmptyState
        icon="plan"
        title="No site selected"
        description="Select a site from the navigation bar to plan tomorrow's work."
      />
    )
  }

  if (loading) return <LoadingSkeleton lines={3} />

  const today = new Date().toISOString().split('T')[0]
  const isLocked = plan && plan.planDate <= today
  const previousPlans = plans.filter((p) => p.planDate !== tomorrowStr)

  return (
    <div className="space-y-4 animate-fade-in pb-8 px-4 pt-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 rounded-2xl p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="w-5 h-5 text-brand-200 flex-shrink-0" />
              <span className="text-mobile-sm font-medium text-brand-200">Tomorrow Plan</span>
            </div>
            <h1 className="text-mobile-xl font-bold">
              {tomorrow.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h1>
          </div>
          {plan && (
            <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 rounded-xl px-2.5 py-1.5 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-mobile-xs font-bold text-green-300">Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-site-200">
        <button
          onClick={() => setTab('edit')}
          className={clsx(
            'px-4 py-2.5 text-mobile-sm font-medium border-b-2 transition-colors min-h-touch',
            tab === 'edit'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-site-500 hover:text-site-700'
          )}
        >
          <span className="flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" />
            Tomorrow&apos;s Plan
          </span>
        </button>
        <button
          onClick={() => setTab('history')}
          className={clsx(
            'px-4 py-2.5 text-mobile-sm font-medium border-b-2 transition-colors min-h-touch',
            tab === 'history'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-site-500 hover:text-site-700'
          )}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            History ({previousPlans.length})
          </span>
        </button>
      </div>

      {tab === 'edit' ? (
        <div className="space-y-4">
          {isLocked && (
            <div className="bg-brand-50 border border-brand-200 text-brand-800 px-4 py-3 rounded-xl text-mobile-sm flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              This plan is locked — the plan date has arrived.
            </div>
          )}

          {plan && !isLocked && (
            <div className="flex items-center gap-2 text-mobile-xs text-site-400">
              <span className="badge bg-green-100 text-green-700">Saved</span>
              Last updated {new Date(plan.updatedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          <div className="card space-y-4">
            <div>
              <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">
                <ClipboardList className="w-4 h-4 inline mr-1.5 text-site-400" />
                Planned tasks <span className="text-safety-red">*</span>
              </label>
              <textarea
                className="textarea-field"
                rows={5}
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                placeholder="List what you plan to do tomorrow..."
                disabled={!!isLocked}
              />
              <p className="text-mobile-xs text-site-400 mt-1">
                {tasks.trim().split('\n').filter(Boolean).length} task line(s)
              </p>
            </div>

            <div>
              <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">
                <Package className="w-4 h-4 inline mr-1.5 text-site-400" />
                Required resources
              </label>
              <textarea
                className="textarea-field"
                rows={2}
                value={requiredResources}
                onChange={(e) => setRequiredResources(e.target.value)}
                placeholder="Materials, equipment, personnel needed..."
                disabled={!!isLocked}
              />
            </div>

            <div>
              <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">
                <AlertTriangle className="w-4 h-4 inline mr-1.5 text-safety-amber" />
                Known risks
              </label>
              <textarea
                className="textarea-field"
                rows={2}
                value={knownRisks}
                onChange={(e) => setKnownRisks(e.target.value)}
                placeholder="Potential issues or dependencies..."
                disabled={!!isLocked}
              />
            </div>

            {!isLocked && (
              <button
                onClick={save}
                className="btn-primary w-full"
                disabled={saving || !tasks.trim()}
              >
                {saving ? 'Saving...' : plan ? 'Update Plan' : 'Save Plan'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {previousPlans.length === 0 ? (
            <EmptyState
              icon="plan"
              title="No previous plans"
              description="Your plan history will appear here."
            />
          ) : (
            previousPlans.slice(0, 15).map((p) => {
              const planDate = new Date(p.planDate + 'T00:00:00')
              const isPast = p.planDate <= today
              return (
                <div key={p.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-mobile-sm font-medium text-site-700">
                      {planDate.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={clsx(
                      'badge',
                      isPast ? 'bg-site-100 text-site-600' : 'bg-brand-100 text-brand-700'
                    )}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-mobile-sm text-site-600 whitespace-pre-line">{p.tasks}</p>
                  {p.requiredResources && (
                    <div className="mt-2 pt-2 border-t border-site-100">
                      <p className="text-mobile-xs text-site-400">
                        <Package className="w-3 h-3 inline mr-1" />
                        {p.requiredResources}
                      </p>
                    </div>
                  )}
                  {p.knownRisks && (
                    <div className="mt-1">
                      <p className="text-mobile-xs text-safety-amber">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {p.knownRisks}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function TomorrowPlanPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={3} />}>
      <TomorrowPlanInner />
    </Suspense>
  )
}
