'use client'

import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import EvidenceUpload from '@/components/EvidenceUpload'
import EvidenceList from '@/components/EvidenceList'
import { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Send,
  Save,
  AlertCircle,
  Shield,
} from 'lucide-react'

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

const tabs = [
  { key: 'quick' as const, label: 'Quick Report', icon: Zap },
  { key: 'full' as const, label: 'Full Details', icon: FileText },
  { key: 'history' as const, label: 'History', icon: Clock },
]

export default function DailyReportPage() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()

  const today = new Date().toISOString().split('T')[0]

  const [activeTab, setActiveTab] = useState<'quick' | 'full' | 'history'>('quick')
  const [reportList, setReportList] = useState<ReportListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
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

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  const loadReportDetail = useCallback(async (reportId: string) => {
    setReportLoading(true)
    try {
      const res = await fetch(`/api/daily-reports/${reportId}`)
      const data = await res.json()
      if (res.ok && data.report) {
        setReport(data.report)
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

  const backToHistory = () => {
    setViewingReportId(null)
    loadTodayReport()
  }

  const switchTab = (tab: 'quick' | 'full' | 'history') => {
    setActiveTab(tab)
    if (tab !== 'history') {
      setViewingReportId(null)
      loadTodayReport()
    }
  }

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

  const isSubmitted = report?.status === 'submitted'
  const isViewingHistory = activeTab === 'history' && viewingReportId !== null
  const todayFormatted = new Date(today + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-site-800">Daily Report</h1>
        <span className="text-sm font-medium text-site-500">{todayFormatted}</span>
      </div>

      {/* 3-Tab Switcher */}
      <div className="flex bg-site-100 rounded-2xl p-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? tab.key === 'quick'
                    ? 'bg-construction-500 text-white shadow-action'
                    : 'bg-white text-site-800 shadow-card'
                  : 'text-site-500 hover:text-site-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              {tab.key === 'history' && <span className="text-xs opacity-70">({reportList.length})</span>}
            </button>
          )
        })}
      </div>

      {/* ============ QUICK REPORT TAB ============ */}
      {activeTab === 'quick' && (
        <>
          {reportLoading ? (
            <LoadingSkeleton lines={3} />
          ) : (
            <div className="space-y-4">
              {isSubmitted && (
                <div className="bg-green-50 border-2 border-green-200 text-green-800 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
                  Report submitted. Switch to Full Details to view annotations.
                </div>
              )}

              {/* Quick form — work summary only + evidence */}
              <div className="card space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-construction-50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-construction-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-site-800">What happened today?</h2>
                    <p className="text-xs text-site-500">Just the essentials — add details later</p>
                  </div>
                </div>

                <textarea
                  className="textarea-field text-base"
                  rows={5}
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="Poured foundation for Block C, installed rebar in Zone 2..."
                  disabled={isSubmitted}
                />

                {/* QA checkbox */}
                <label className="flex items-center gap-3 py-2 touch-target">
                  <input
                    type="checkbox"
                    checked={qaSafetyConfirmed}
                    onChange={(e) => setQaSafetyConfirmed(e.target.checked)}
                    className="w-6 h-6 rounded-lg border-2 border-site-300 text-safety-green focus:ring-safety-green"
                    disabled={isSubmitted}
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-safety-green" />
                    <span className="text-sm font-semibold text-site-700">QA/Safety confirmed</span>
                  </div>
                </label>
              </div>

              {/* Evidence */}
              <div className="card space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-site-400" />
                  <h2 className="font-bold text-site-800">Evidence</h2>
                  {evidence.length > 0 && (
                    <span className="badge bg-construction-100 text-construction-700">{evidence.length}</span>
                  )}
                </div>
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
                  <p className="text-sm text-site-400 italic">Save report first to attach evidence</p>
                )}
              </div>

              {/* Actions */}
              {!isSubmitted && (
                <div className="flex gap-3">
                  <button
                    onClick={save}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    disabled={saving || !workSummary.trim()}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={submit}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={submitting || !workSummary.trim()}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ FULL DETAILS TAB ============ */}
      {activeTab === 'full' && (
        <>
          {reportLoading ? (
            <LoadingSkeleton lines={6} />
          ) : (
            <div className="space-y-4">
              {isSubmitted && (
                <div className="bg-brand-50 border-2 border-brand-200 text-brand-800 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-medium">
                  <Lock className="w-5 h-5 flex-shrink-0 text-brand-600" />
                  Immutable after submit. Corrections via annotations only.
                </div>
              )}

              {/* Full form */}
              <div className="card space-y-5">
                <div>
                  <label className="block text-sm font-bold text-site-700 mb-1.5">
                    Work Summary <span className="text-safety-red">*</span>
                  </label>
                  <textarea
                    className="textarea-field"
                    rows={4}
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    placeholder="Describe work completed today..."
                    disabled={isSubmitted}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-site-700 mb-1.5">Personnel on Site</label>
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
                  <label className="block text-sm font-bold text-site-700 mb-1.5">Issues or Blockers</label>
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
                  <label className="block text-sm font-bold text-site-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-safety-red" />
                      Incidents
                    </span>
                  </label>
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
                  <label className="block text-sm font-bold text-site-700 mb-1.5">Weather</label>
                  <input
                    className="input-field"
                    value={weatherConditions}
                    onChange={(e) => setWeatherConditions(e.target.value)}
                    placeholder="e.g., Sunny, 28°C"
                    disabled={isSubmitted}
                  />
                </div>

                <label className="flex items-center gap-3 py-2 touch-target">
                  <input
                    type="checkbox"
                    checked={qaSafetyConfirmed}
                    onChange={(e) => setQaSafetyConfirmed(e.target.checked)}
                    className="w-6 h-6 rounded-lg border-2 border-site-300 text-safety-green focus:ring-safety-green"
                    disabled={isSubmitted}
                  />
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-safety-green" />
                    <span className="text-sm font-semibold text-site-700">QA/Safety confirmed for today</span>
                  </div>
                </label>
              </div>

              {/* Evidence */}
              <div className="card space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-site-400" />
                  <h2 className="font-bold text-site-800">Evidence</h2>
                  {evidence.length > 0 && (
                    <span className="badge bg-construction-100 text-construction-700">{evidence.length}</span>
                  )}
                </div>
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
                  <p className="text-sm text-site-400 italic">Save report first to attach evidence</p>
                )}
              </div>

              {/* Annotations */}
              {isSubmitted && report?.annotations && report.annotations.length > 0 && (
                <div className="card space-y-3">
                  <h2 className="font-bold text-site-800">Annotations</h2>
                  {report.annotations.map((a) => (
                    <div key={a.id} className="bg-site-50 rounded-xl p-3 border border-site-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-site-700">{a.createdBy.displayName}</span>
                        <span className={`badge text-xs ${
                          a.annotationType === 'amendment_request' ? 'bg-amber-100 text-amber-700' :
                          a.annotationType === 'correction' ? 'bg-blue-100 text-blue-700' :
                          'bg-site-100 text-site-600'
                        }`}>{a.annotationType.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-site-700">{a.content}</p>
                      <p className="text-xs text-site-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {!isSubmitted && (
                <div className="flex gap-3">
                  <button
                    onClick={save}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    disabled={saving || !workSummary.trim()}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : report ? 'Save Draft' : 'Create Draft'}
                  </button>
                  <button
                    onClick={submit}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={submitting || !workSummary.trim()}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ HISTORY TAB ============ */}
      {activeTab === 'history' && (
        <>
          {isViewingHistory && report ? (
            <div className="space-y-4">
              <button onClick={backToHistory} className="text-sm text-brand-600 hover:underline flex items-center gap-1 font-semibold">
                <ChevronLeft className="w-4 h-4" />
                Back to history
              </button>

              {reportLoading ? (
                <LoadingSkeleton lines={5} />
              ) : (
                <>
                  <div className="card space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-site-800">
                        {new Date(report.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h2>
                      <span className={`badge-${report.status}`}>{report.status}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="section-header mb-1">Work Summary</p>
                        <p className="text-sm text-site-700 whitespace-pre-line">{report.workSummary}</p>
                      </div>
                      {report.personnelOnSite && (
                        <div>
                          <p className="section-header mb-1">Personnel</p>
                          <p className="text-sm text-site-700 whitespace-pre-line">{report.personnelOnSite}</p>
                        </div>
                      )}
                      {report.issuesOrBlockers && (
                        <div>
                          <p className="section-header mb-1">Issues/Blockers</p>
                          <p className="text-sm text-site-700 whitespace-pre-line">{report.issuesOrBlockers}</p>
                        </div>
                      )}
                      {report.incidents && (
                        <div>
                          <p className="section-header mb-1">Incidents</p>
                          <p className="text-sm text-site-700 whitespace-pre-line">{report.incidents}</p>
                        </div>
                      )}
                      {report.weatherConditions && (
                        <div>
                          <p className="section-header mb-1">Weather</p>
                          <p className="text-sm text-site-700">{report.weatherConditions}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {report.qaSafetyConfirmed ? (
                          <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            QA/Safety confirmed
                          </span>
                        ) : (
                          <span className="badge bg-site-100 text-site-500">QA/Safety not confirmed</span>
                        )}
                      </div>

                      {report.submittedAt && (
                        <p className="text-xs text-site-400">Submitted {new Date(report.submittedAt).toLocaleString('en-ZA')}</p>
                      )}
                    </div>
                  </div>

                  <div className="card space-y-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-site-400" />
                      <h2 className="font-bold text-site-800">Evidence</h2>
                    </div>
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

                  {report.annotations && report.annotations.length > 0 && (
                    <div className="card space-y-3">
                      <h2 className="font-bold text-site-800">Annotations</h2>
                      {report.annotations.map((a) => (
                        <div key={a.id} className="bg-site-50 rounded-xl p-3 border border-site-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">{a.createdBy.displayName}</span>
                            <span className={`badge text-xs ${
                              a.annotationType === 'amendment_request' ? 'bg-amber-100 text-amber-700' :
                              a.annotationType === 'correction' ? 'bg-blue-100 text-blue-700' :
                              'bg-site-100 text-site-600'
                            }`}>{a.annotationType.replace('_', ' ')}</span>
                          </div>
                          <p className="text-sm text-site-700">{a.content}</p>
                          <p className="text-xs text-site-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {listLoading ? (
                <LoadingSkeleton lines={5} />
              ) : reportList.length === 0 ? (
                <EmptyState
                  icon="report"
                  title="No reports yet"
                  description="Your completed daily reports will appear here."
                  action={{ label: 'Create Quick Report', onClick: () => switchTab('quick') }}
                />
              ) : (
                <div className="space-y-2">
                  {reportList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadReportDetail(r.id)}
                      className="card-interactive w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-site-800">
                              {new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {r.reportDate === today && (
                              <span className="badge bg-construction-100 text-construction-700">Today</span>
                            )}
                          </div>
                          <p className="text-sm text-site-500 truncate mt-0.5">
                            {r.workSummary.length > 90 ? r.workSummary.slice(0, 90) + '...' : r.workSummary}
                          </p>
                          {r._count && r._count.annotations > 0 && (
                            <span className="text-xs text-site-400 mt-1 inline-block">
                              {r._count.annotations} annotation{r._count.annotations !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`badge-${r.status}`}>{r.status}</span>
                          <ChevronRight className="w-4 h-4 text-site-300" />
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
