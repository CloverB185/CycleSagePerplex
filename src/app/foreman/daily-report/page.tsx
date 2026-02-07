'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import EvidenceUpload from '@/components/EvidenceUpload'
import EvidenceList from '@/components/EvidenceList'

type Report = {
  id: string
  reportDate: string
  status: string
  workSummary: string
  personnelOnSite: string | null
  issuesOrBlockers: string | null
  incidents: string | null
  weatherConditions: string | null
  qaSafetyConfirmed: boolean
  submittedAt: string | null
  evidence: Array<Record<string, unknown>>
  annotations: Array<{
    id: string
    content: string
    annotationType: string
    createdAt: string
    createdBy: { displayName: string; role: string }
  }>
}

function DailyReportInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const siteId = searchParams.get('siteId')
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([])

  // Form state
  const [workSummary, setWorkSummary] = useState('')
  const [personnelOnSite, setPersonnelOnSite] = useState('')
  const [issuesOrBlockers, setIssuesOrBlockers] = useState('')
  const [incidents, setIncidents] = useState('')
  const [weatherConditions, setWeatherConditions] = useState('')
  const [qaSafetyConfirmed, setQaSafetyConfirmed] = useState(false)

  useEffect(() => {
    if (!siteId) return
    setLoading(true)
    fetch(`/api/daily-reports?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        const existing = data.reports?.find((r: Report) => r.reportDate === date)
        if (existing) {
          setReport(existing)
          setWorkSummary(existing.workSummary || '')
          setPersonnelOnSite(existing.personnelOnSite || '')
          setIssuesOrBlockers(existing.issuesOrBlockers || '')
          setIncidents(existing.incidents || '')
          setWeatherConditions(existing.weatherConditions || '')
          setQaSafetyConfirmed(existing.qaSafetyConfirmed || false)
          setEvidence(existing.evidence || [])
        }
      })
      .finally(() => setLoading(false))
  }, [siteId, date])

  const save = async () => {
    if (!siteId) return
    setSaving(true)
    try {
      const body = {
        siteId,
        reportDate: date,
        workSummary,
        personnelOnSite,
        issuesOrBlockers,
        incidents,
        weatherConditions,
        qaSafetyConfirmed,
      }

      let res
      if (report) {
        res = await fetch(`/api/daily-reports/${report.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/daily-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (res.ok) {
        setReport(data.report)
      }
    } finally {
      setSaving(false)
    }
  }

  const submit = async () => {
    if (!report) {
      await save()
    }

    const confirmSubmit = evidence.length === 0
      ? confirm('No evidence attached. Submit anyway?')
      : true

    if (!confirmSubmit) return

    setSubmitting(true)
    try {
      const reportId = report?.id
      if (!reportId) return

      const res = await fetch(`/api/daily-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          workSummary,
          personnelOnSite,
          issuesOrBlockers,
          incidents,
          weatherConditions,
          qaSafetyConfirmed,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setReport(data.report)
      } else {
        alert(data.error || 'Failed to submit')
      }
    } finally {
      setSubmitting(false)
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

  const isSubmitted = report?.status === 'submitted'

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Daily Report</h1>
        <span className="text-sm text-gray-500">{new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          This report has been submitted and is now immutable. Use annotations for corrections.
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What was done today? <span className="text-safety-red">*</span>
          </label>
          <textarea
            className="textarea-field"
            rows={4}
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            placeholder="Describe work completed today..."
            disabled={isSubmitted}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Who was on site?</label>
          <textarea
            className="textarea-field"
            rows={2}
            value={personnelOnSite}
            onChange={(e) => setPersonnelOnSite(e.target.value)}
            placeholder="List personnel present..."
            disabled={isSubmitted}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issues or blockers</label>
          <textarea
            className="textarea-field"
            rows={2}
            value={issuesOrBlockers}
            onChange={(e) => setIssuesOrBlockers(e.target.value)}
            placeholder="Any issues encountered..."
            disabled={isSubmitted}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Incidents</label>
          <textarea
            className="textarea-field"
            rows={2}
            value={incidents}
            onChange={(e) => setIncidents(e.target.value)}
            placeholder="Any safety incidents..."
            disabled={isSubmitted}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weather</label>
          <input
            className="input-field"
            value={weatherConditions}
            onChange={(e) => setWeatherConditions(e.target.value)}
            placeholder="e.g., Sunny, 28°C"
            disabled={isSubmitted}
          />
        </div>

        <label className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={qaSafetyConfirmed}
            onChange={(e) => setQaSafetyConfirmed(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            disabled={isSubmitted}
          />
          <span className="text-sm font-medium text-gray-700">
            QA/Safety confirmed for today
          </span>
        </label>
      </div>

      {/* Evidence section */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800">Evidence</h2>
        <EvidenceList evidence={evidence as never[]} />
        {!isSubmitted && report && (
          <EvidenceUpload
            siteId={siteId}
            contextType="daily_report"
            contextId={report.id}
            onUpload={(e) => setEvidence((prev) => [...prev, e])}
          />
        )}
        {!isSubmitted && !report && (
          <p className="text-sm text-gray-400 italic">Save the report first to attach evidence</p>
        )}
      </div>

      {/* Annotations (visible on submitted reports) */}
      {isSubmitted && report?.annotations && report.annotations.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Annotations</h2>
          {report.annotations.map((a) => (
            <div key={a.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{a.createdBy.displayName}</span>
                <span className={`badge text-xs ${
                  a.annotationType === 'amendment_request' ? 'bg-amber-100 text-amber-700' :
                  a.annotationType === 'correction' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{a.annotationType.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-gray-700">{a.content}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex gap-3">
          <button
            onClick={save}
            className="btn-secondary flex-1"
            disabled={saving || !workSummary.trim()}
          >
            {saving ? 'Saving...' : report ? 'Save Draft' : 'Create Draft'}
          </button>
          <button
            onClick={submit}
            className="btn-primary flex-1"
            disabled={submitting || !workSummary.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function DailyReportPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-400 animate-pulse">Loading...</div>}>
      <DailyReportInner />
    </Suspense>
  )
}
