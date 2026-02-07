'use client'

import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import { useState, useEffect, useCallback, Suspense } from 'react'

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
    <div className="space-y-4 animate-fade-in pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Tomorrow Plan</h1>
        <span className="text-sm text-gray-500">
          {tomorrow.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('edit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'edit'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tomorrow&apos;s Plan
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'history'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          History ({previousPlans.length})
        </button>
      </div>

      {tab === 'edit' ? (
        <div className="space-y-4">
          {isLocked && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              This plan is locked — the plan date has arrived.
            </div>
          )}

          {plan && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="badge bg-green-100 text-green-700">Saved</span>
              Last updated {new Date(plan.updatedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <p className="text-xs text-gray-400 mt-1">
                {tasks.trim().split('\n').filter(Boolean).length} task line(s)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required resources</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Known risks</label>
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
                    <span className="text-sm font-medium text-gray-700">
                      {planDate.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className={`badge ${isPast ? 'bg-gray-100 text-gray-600' : 'bg-brand-100 text-brand-700'}`}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{p.tasks}</p>
                  {p.requiredResources && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400">Resources: {p.requiredResources}</p>
                    </div>
                  )}
                  {p.knownRisks && (
                    <div className="mt-1">
                      <p className="text-xs text-amber-500">Risks: {p.knownRisks}</p>
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
