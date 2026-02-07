'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

type Plan = {
  id: string
  planDate: string
  tasks: string
  requiredResources: string | null
  knownRisks: string | null
  createdAt: string
}

function TomorrowPlanInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const siteId = searchParams.get('siteId')

  // Tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [plan, setPlan] = useState<Plan | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tasks, setTasks] = useState('')
  const [requiredResources, setRequiredResources] = useState('')
  const [knownRisks, setKnownRisks] = useState('')

  useEffect(() => {
    if (!siteId) return
    setLoading(true)
    fetch(`/api/tomorrow-plans?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        const allPlans = data.plans || []
        setPlans(allPlans)
        const existing = allPlans.find((p: Plan) => p.planDate === tomorrowStr)
        if (existing) {
          setPlan(existing)
          setTasks(existing.tasks || '')
          setRequiredResources(existing.requiredResources || '')
          setKnownRisks(existing.knownRisks || '')
        }
      })
      .finally(() => setLoading(false))
  }, [siteId, tomorrowStr])

  const save = async () => {
    if (!siteId || !tasks.trim()) return
    setSaving(true)
    try {
      if (plan) {
        // Update existing
        const res = await fetch(`/api/tomorrow-plans/${plan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, requiredResources, knownRisks }),
        })
        const data = await res.json()
        if (res.ok) setPlan(data.plan)
        else alert(data.error || 'Failed to update')
      } else {
        // Create new
        const res = await fetch('/api/tomorrow-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, planDate: tomorrowStr, tasks, requiredResources, knownRisks }),
        })
        const data = await res.json()
        if (res.ok) setPlan(data.plan)
        else alert(data.error || 'Failed to create')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!siteId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select a site from the dashboard first
        <button onClick={() => router.push('/foreman')} className="btn-primary block mx-auto mt-4">
          Go to Dashboard
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-400 animate-pulse">Loading...</div>
  }

  const today = new Date().toISOString().split('T')[0]
  const isLocked = plan && plan.planDate <= today

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Tomorrow Plan</h1>
        <span className="text-sm text-gray-500">
          {tomorrow.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {isLocked && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          This plan is locked — the plan date has arrived.
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

      {/* Previous plans */}
      {plans.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600">Previous Plans</h2>
          {plans
            .filter((p) => p.planDate !== tomorrowStr)
            .slice(0, 5)
            .map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(p.planDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-line">{p.tasks}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default function TomorrowPlanPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-400 animate-pulse">Loading...</div>}>
      <TomorrowPlanInner />
    </Suspense>
  )
}
