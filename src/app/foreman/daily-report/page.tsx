'use client'

import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import EvidenceUpload from '@/components/EvidenceUpload'
import EvidenceList from '@/components/EvidenceList'
import { useState, useEffect, useCallback } from 'react'

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

type ReportListItem = {
  id: string
  reportDate: string
  status: string
  workSummary: string
  _count?: { annotations: number }
}

export default function DailyReportPage() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()

  const today = new Date().toISOString().split('T')[0]

  // Tab state
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today')

  // Report list for history
  const [reportList, setReportList] = useState<ReportListItem[]>([])
  const [listLoading, setListLoading] = useState(true)

  // Current report (today's or selected from history)
  const [report, setReport] = useState<Report | null>(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  // Form state
  const [workSummary, setWorkSummary] = useState('')
  const [personnelOnSite, setPersonnelOnSite] = useState('')
  const [issuesOrBlockers, setIssuesOrBlockers] = useState('')
  const [incidents, setIncidents] = useState('')
  const [weatherConditions, setWeatherConditions] = useState('')
  const [qaSafetyConfirmed, setQaSafetyConfirmed] = useState(false)
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([])

  // Action states
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load all reports for the site (for both stats and history)
  const loadReportList = useCallback(async () => {
    if (!site) return
    setListLoading(true)
    try {
      const res = await fetch(`/api/daily-reports?siteId=${site.id}`)
      const data = await res.json()
      setReportList(data.reports || [])
    } catch {
      toast('Failed to load reports', 'error')
    } finally {
      setListLoading(false)
    }
  }, [site, toast])

  // Load today's report specifically
  const loadTodayReport = useCallback(async () => {
    if (!site) return
    setReportLoading(true)
    try {
      const res = await fetch(`/api/daily-reports?siteId=${site.id}`)
      const data = await res.json()
      const reports: Report[] = data.reports || []
      const existing = reports.find((r) => r.reportDate === today)
      if (existing) {
        setReport(existing)
        setWorkSummary(existing.workSummary || '')
        setPersonnelOnSite(existing.personnelOnSite || '')
        setIssuesOrBlockers(existing.issuesOrBlockers || '')
        setIncidents(existing.incidents || '')
        setWeatherConditions(existing.weatherConditions || '')
        setQaSafetyConfirmed(existing.qaSafetyConfirmed || false)
        setEvidence(existing.evidence || [])
      } else {
        setReport(null)
        setWorkSummary('')
        setPersonnelOnSite('')
        setIssuesOrBlockers('')
        setIncidents('')
        setWeatherConditions('')
        setQaSafetyConfirmed(false)
        setEvidence([])
      }
    } catch {
      toast('Failed to load today\'s report', 'error')
    } finally {
      setReportLoading(false)
    }
  }, [site, today, toast])

  // Load a specific report by ID (for history detail view)
  const loadReportDetail = useCallback(async (reportId: string) => {
    setReportLoading(true)
    try {
      const res = await fetch(`/api/daily-reports/${reportId}`)
      const data = await res.json()
      if (res.ok && data.report) {
        setReport(data.report)
        setWorkSummary(data.report.workSummary || '')
        setPersonnelOnSite(data.report.personnelOnSite || '')
        setIssuesOrBlockers(data.report.issuesOrBlockers || '')
        setIncidents(data.report.incidents || '')
        setWeatherConditions(data.report.weatherConditions || '')
        setQaSafetyConfirmed(data.report.qaSafetyConfirmed || false)
        setEvidence(data.report.evidence || [])
        setViewingReportId(reportId)
      }
    } catch {
      toast('Failed to load report', 'error')
    } finally {
      setReportLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadReportList()
    loadTodayReport()
  }, [loadReportList, loadTodayReport])

  // Save draft
  const save = async () => {
    if (!site) return
    setSaving(true)
    try {
      const body = {
        siteId: site.id,
        reportDate: today,
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
        toast(report ? 'Draft saved' : 'Report created', 'success')
        loadReportList()
      } else {
        toast(data.error || 'Failed to save', 'error')
      }
    } catch {
      toast('Network error while saving', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Submit report
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
        toast('Report submitted successfully', 'success')
        loadReportList()
      } else {
        toast(data.error || 'Failed to submit', 'error')
      }
    } catch {
      toast('Network error while submitting', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Navigate back to history list from detail view
  const backToHistory = () => {
    setViewingReportId(null)
    loadTodayReport()
  }

  // Switch tabs
  const switchTab = (tab: 'today' | 'history') => {
    setActiveTab(tab)
    if (tab === 'today') {
      setViewingReportId(null)
      loadTodayReport()
    }
  }

  // Loading states
  if (siteLoading) {
    return <LoadingSkeleton lines={4} />
  }

  if (!site) {
    return (
      <EmptyState
        icon="report"
        title="No site selected"
        description="Select a site from the navigation bar to get started."
      />
    )
  }

  const isSubmitted = report?.status === 'submitted'
  const isViewingHistory = activeTab === 'history' && viewingReportId !== null

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Daily Report</h1>
        <span className="text-sm text-gray-500">
          {new Date(today + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => switchTab('today')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'today'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => switchTab('history')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History ({reportList.length})
        </button>
      </div>

      {/* ========== TODAY TAB ========== */}
      {activeTab === 'today' && (
        <>
          {reportLoading ? (
            <LoadingSkeleton lines={5} />
          ) : (
            <>
              {isSubmitted && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  This report has been submitted and is now immutable. Use annotations for corrections.
                </div>
              )}

              {/* Form Card */}
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

              {/* Evidence Section */}
              <div className="card space-y-3">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Evidence
                  {evidence.length > 0 && (
                    <span className="badge bg-brand-100 text-brand-700 text-xs">{evidence.length}</span>
                  )}
                </h2>
                <EvidenceList evidence={evidence as never[]} />
                {!isSubmitted && report && (
                  <EvidenceUpload
                    siteId={site.id}
                    contextType="daily_report"
                    contextId={report.id}
                    onUpload={(e) => {
                      setEvidence((prev) => [...prev, e])
                      toast('Evidence uploaded', 'success')
                    }}
                  />
                )}
                {!isSubmitted && !report && (
                  <p className="text-sm text-gray-400 italic">Save the report first to attach evidence</p>
                )}
              </div>

              {/* Annotations (submitted reports) */}
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
            </>
          )}
        </>
      )}

      {/* ========== HISTORY TAB ========== */}
      {activeTab === 'history' && (
        <>
          {isViewingHistory && report ? (
            /* ---- History Detail View (read-only for submitted) ---- */
            <div className="space-y-4">
              <button onClick={backToHistory} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to history
              </button>

              {reportLoading ? (
                <LoadingSkeleton lines={5} />
              ) : (
                <>
                  <div className="card space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-gray-800">
                        {new Date(report.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h2>
                      <span className={`badge-${report.status}`}>{report.status}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Work Summary</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{report.workSummary}</p>
                      </div>

                      {report.personnelOnSite && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Personnel</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{report.personnelOnSite}</p>
                        </div>
                      )}

                      {report.issuesOrBlockers && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Issues/Blockers</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{report.issuesOrBlockers}</p>
                        </div>
                      )}

                      {report.incidents && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Incidents</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{report.incidents}</p>
                        </div>
                      )}

                      {report.weatherConditions && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Weather</p>
                          <p className="text-sm text-gray-700">{report.weatherConditions}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {report.qaSafetyConfirmed ? (
                          <span className="badge bg-green-100 text-green-700 text-xs flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            QA/Safety confirmed
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-500 text-xs">QA/Safety not confirmed</span>
                        )}
                      </div>

                      {report.submittedAt && (
                        <p className="text-xs text-gray-400">
                          Submitted {new Date(report.submittedAt).toLocaleString('en-ZA')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Evidence in detail view */}
                  <div className="card space-y-3">
                    <h2 className="font-semibold text-gray-800">Evidence</h2>
                    <EvidenceList evidence={(report.evidence || []) as never[]} />
                    {report.status !== 'submitted' && (
                      <EvidenceUpload
                        siteId={site.id}
                        contextType="daily_report"
                        contextId={report.id}
                        onUpload={(e) => {
                          setEvidence((prev) => [...prev, e])
                          setReport((prev) => prev ? { ...prev, evidence: [...(prev.evidence || []), e] } : prev)
                          toast('Evidence uploaded', 'success')
                        }}
                      />
                    )}
                  </div>

                  {/* Annotations in detail view */}
                  {report.annotations && report.annotations.length > 0 && (
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
                </>
              )}
            </div>
          ) : (
            /* ---- History List View ---- */
            <>
              {listLoading ? (
                <LoadingSkeleton lines={5} />
              ) : reportList.length === 0 ? (
                <EmptyState
                  icon="report"
                  title="No reports yet"
                  description="Your completed daily reports will appear here."
                  action={{
                    label: 'Create Today\'s Report',
                    onClick: () => switchTab('today'),
                  }}
                />
              ) : (
                <div className="space-y-2">
                  {reportList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadReportDetail(r.id)}
                      className="card w-full text-left hover:border-brand-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">
                              {new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {r.reportDate === today && (
                              <span className="badge bg-brand-100 text-brand-700 text-xs">Today</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {r.workSummary.length > 100 ? r.workSummary.slice(0, 100) + '...' : r.workSummary}
                          </p>
                          {r._count && r._count.annotations > 0 && (
                            <span className="text-xs text-gray-400 mt-1 inline-block">
                              {r._count.annotations} annotation{r._count.annotations !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`badge-${r.status}`}>{r.status}</span>
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
