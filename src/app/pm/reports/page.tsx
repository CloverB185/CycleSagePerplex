'use client'

import { useEffect, useState } from 'react'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
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
  createdBy: { id: string; displayName: string }
  site: { name: string }
  annotations: Array<{
    id: string
    content: string
    annotationType: string
    createdAt: string
    createdBy: { id: string; displayName: string; role: string }
  }>
  evidence: Array<Record<string, unknown>>
  _count: { annotations: number }
}

type ListReport = {
  id: string
  reportDate: string
  status: string
  workSummary: string
  createdBy: { id: string; displayName: string }
  evidence: Array<{ id: string }>
  _count: { annotations: number }
}

export default function PMReportsPage() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()
  const [reports, setReports] = useState<ListReport[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [annotationText, setAnnotationText] = useState('')
  const [annotationType, setAnnotationType] = useState<'comment' | 'amendment_request'>('comment')
  const [submittingAnnotation, setSubmittingAnnotation] = useState(false)

  useEffect(() => {
    if (!site) return
    setLoading(true)
    setSelected(null)
    fetch(`/api/daily-reports?siteId=${site.id}`)
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => toast('Failed to load reports', 'error'))
      .finally(() => setLoading(false))
  }, [site]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/daily-reports/${id}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setSelected(data.report)
    } catch {
      toast('Failed to load report details', 'error')
    }
  }

  const addAnnotation = async () => {
    if (!selected || !annotationText.trim()) return
    setSubmittingAnnotation(true)
    try {
      const res = await fetch(`/api/daily-reports/${selected.id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: annotationText, annotationType }),
      })
      if (res.ok) {
        setAnnotationText('')
        setAnnotationType('comment')
        toast(
          annotationType === 'comment' ? 'Comment added' : 'Amendment request sent',
          'success'
        )
        loadDetail(selected.id)
      } else {
        const data = await res.json()
        toast(data.error || 'Failed to add annotation', 'error')
      }
    } catch {
      toast('Failed to add annotation', 'error')
    } finally {
      setSubmittingAnnotation(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (siteLoading) {
    return <LoadingSkeleton lines={4} />
  }

  if (!site) {
    return (
      <EmptyState
        icon="report"
        title="No site selected"
        description="Select a site from the navigation bar to view reports."
      />
    )
  }

  // Detail view
  if (selected) {
    return (
      <div className="space-y-4 pb-8 animate-fade-in">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-brand-600 hover:underline flex items-center gap-1"
        >
          &larr; Back to reports
        </button>

        {/* Report header */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {formatDate(selected.reportDate)}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                by {selected.createdBy.displayName}
                {selected.submittedAt && (
                  <span className="ml-2 text-gray-400">
                    &middot; Submitted {new Date(selected.submittedAt).toLocaleString('en-ZA')}
                  </span>
                )}
              </p>
            </div>
            <span className={`badge badge-${selected.status}`}>{selected.status}</span>
          </div>

          {/* Report sections */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Work Summary
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line mt-1.5">
                {selected.workSummary}
              </p>
            </div>

            {selected.personnelOnSite && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Personnel on Site
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1.5">
                  {selected.personnelOnSite}
                </p>
              </div>
            )}

            {selected.issuesOrBlockers && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Issues / Blockers
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1.5">
                  {selected.issuesOrBlockers}
                </p>
              </div>
            )}

            {selected.incidents && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Incidents
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1.5">
                  {selected.incidents}
                </p>
              </div>
            )}

            {selected.weatherConditions && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Weather Conditions
                </h3>
                <p className="text-sm text-gray-700 mt-1.5">{selected.weatherConditions}</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                QA / Safety Confirmed
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    selected.qaSafetyConfirmed ? 'text-safety-green' : 'text-safety-red'
                  }`}
                >
                  {selected.qaSafetyConfirmed ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmed
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Not confirmed
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence Gallery */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Evidence</h2>
            <span className="text-xs text-gray-400">
              {selected.evidence.length} item{selected.evidence.length !== 1 ? 's' : ''}
            </span>
          </div>
          <EvidenceList evidence={selected.evidence as never[]} />
        </div>

        {/* Annotations */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Annotations</h2>
            <span className="text-xs text-gray-400">
              {selected.annotations?.length || 0} annotation{(selected.annotations?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          {(!selected.annotations || selected.annotations.length === 0) && (
            <p className="text-sm text-gray-400 italic">No annotations yet</p>
          )}

          {selected.annotations?.map((a) => (
            <div key={a.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">
                  {a.createdBy.displayName}
                </span>
                <span className="text-xs text-gray-400 capitalize">{a.createdBy.role}</span>
                <span
                  className={`badge text-xs ${
                    a.annotationType === 'amendment_request'
                      ? 'bg-amber-100 text-amber-700'
                      : a.annotationType === 'correction'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {a.annotationType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-700">{a.content}</p>
              <p className="text-xs text-gray-400 mt-1.5">
                {new Date(a.createdAt).toLocaleString('en-ZA')}
              </p>
            </div>
          ))}

          {/* Add annotation form -- only for submitted reports */}
          {selected.status === 'submitted' && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <textarea
                className="textarea-field text-sm"
                rows={3}
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="Add a comment or request an amendment..."
              />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="annotationType"
                      checked={annotationType === 'comment'}
                      onChange={() => setAnnotationType('comment')}
                      className="text-brand-600"
                    />
                    <span className="text-sm text-gray-600">Comment</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="annotationType"
                      checked={annotationType === 'amendment_request'}
                      onChange={() => setAnnotationType('amendment_request')}
                      className="text-amber-600"
                    />
                    <span className="text-sm text-amber-700">Request Amendment</span>
                  </label>
                </div>
                <button
                  onClick={addAnnotation}
                  className={`ml-auto text-sm ${
                    annotationType === 'amendment_request'
                      ? 'btn-secondary border-amber-300 text-amber-700 hover:bg-amber-50'
                      : 'btn-primary'
                  }`}
                  disabled={submittingAnnotation || !annotationText.trim()}
                >
                  {submittingAnnotation
                    ? 'Submitting...'
                    : annotationType === 'comment'
                    ? 'Add Comment'
                    : 'Request Amendment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">{site.name}</p>
        </div>
        <span className="text-sm text-gray-400">{reports.length} total</span>
      </div>

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon="report"
          title="No reports for this site"
          description="Reports from foremen will appear here once created."
        />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => loadDetail(r.id)}
              className="card w-full text-left hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      {formatShortDate(r.reportDate)}
                    </span>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    by {r.createdBy.displayName}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0 ml-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    {r.evidence.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    {r._count.annotations}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{r.workSummary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
