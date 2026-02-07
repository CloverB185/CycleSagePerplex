'use client'

import { useEffect, useState } from 'react'
import SiteSelector from '@/components/SiteSelector'
import EvidenceList from '@/components/EvidenceList'

type Site = { id: string; name: string; isTestSite: boolean }

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
}

export default function PMReportsPage() {
  const [site, setSite] = useState<Site | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [annotationText, setAnnotationText] = useState('')
  const [submittingAnnotation, setSubmittingAnnotation] = useState(false)

  useEffect(() => {
    if (!site) return
    setLoading(true)
    setSelected(null)
    fetch(`/api/daily-reports?siteId=${site.id}`)
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .finally(() => setLoading(false))
  }, [site])

  const loadDetail = async (id: string) => {
    const res = await fetch(`/api/daily-reports/${id}`)
    const data = await res.json()
    setSelected(data.report)
  }

  const addAnnotation = async (type: 'comment' | 'amendment_request') => {
    if (!selected || !annotationText.trim()) return
    setSubmittingAnnotation(true)
    try {
      const res = await fetch(`/api/daily-reports/${selected.id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: annotationText, annotationType: type }),
      })
      if (res.ok) {
        setAnnotationText('')
        loadDetail(selected.id)
      }
    } finally {
      setSubmittingAnnotation(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Reports</h1>
        <div className="w-56">
          <SiteSelector selectedSiteId={site?.id || null} onSelect={setSite} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 animate-pulse">Loading reports...</div>
      ) : selected ? (
        <div className="space-y-4 pb-8">
          <button onClick={() => setSelected(null)} className="text-sm text-brand-600 hover:underline">
            &larr; Back to list
          </button>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                {new Date(selected.reportDate + 'T00:00:00').toLocaleDateString('en-ZA', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </h2>
              <span className={`badge-${selected.status}`}>{selected.status}</span>
            </div>
            <p className="text-xs text-gray-400">by {selected.createdBy.displayName}</p>

            <div className="space-y-3 pt-2">
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase">Work Summary</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{selected.workSummary}</p>
              </div>
              {selected.personnelOnSite && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase">Personnel</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{selected.personnelOnSite}</p>
                </div>
              )}
              {selected.issuesOrBlockers && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase">Issues / Blockers</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{selected.issuesOrBlockers}</p>
                </div>
              )}
              {selected.incidents && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase">Incidents</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{selected.incidents}</p>
                </div>
              )}
              {selected.weatherConditions && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase">Weather</h3>
                  <p className="text-sm text-gray-700 mt-1">{selected.weatherConditions}</p>
                </div>
              )}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase">QA/Safety</h3>
                <p className={`text-sm mt-1 ${selected.qaSafetyConfirmed ? 'text-safety-green' : 'text-safety-red'}`}>
                  {selected.qaSafetyConfirmed ? 'Confirmed' : 'Not confirmed'}
                </p>
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800">Evidence</h2>
            <EvidenceList evidence={selected.evidence as never[]} />
          </div>

          {/* Annotations */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800">Annotations</h2>
            {selected.annotations?.length === 0 && (
              <p className="text-sm text-gray-400 italic">No annotations</p>
            )}
            {selected.annotations?.map((a) => (
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

            {/* Add annotation (PM can comment or request amendment) */}
            {selected.status === 'submitted' && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <textarea
                  className="textarea-field text-sm"
                  rows={2}
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Add a comment or request an amendment..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addAnnotation('comment')}
                    className="btn-secondary text-sm"
                    disabled={submittingAnnotation || !annotationText.trim()}
                  >
                    Add Comment
                  </button>
                  <button
                    onClick={() => addAnnotation('amendment_request')}
                    className="btn-secondary text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
                    disabled={submittingAnnotation || !annotationText.trim()}
                  >
                    Request Amendment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.length === 0 && site && (
            <p className="text-center py-8 text-gray-400 italic">No reports for this site</p>
          )}
          {!site && (
            <p className="text-center py-8 text-gray-400">Select a site to view reports</p>
          )}
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => loadDetail(r.id)}
              className="card w-full text-left hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{r.reportDate}</span>
                  <span className="text-sm text-gray-400 ml-2">by {r.createdBy.displayName}</span>
                </div>
                <span className={`badge-${r.status}`}>{r.status}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.workSummary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
