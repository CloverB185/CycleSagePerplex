'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import EvidenceList from '@/components/EvidenceList'

type Snag = {
  id: string
  title: string
  description: string
  category: string
  status: string
  createdAt: string
  createdBy: { id: string; displayName: string }
  owner: { id: string; displayName: string }
  _count?: { comments: number }
}

type SnagDetail = Snag & {
  comments: Array<{
    id: string
    content: string
    createdAt: string
    createdBy: { displayName: string; role: string }
  }>
}

type SiteUser = { id: string; displayName: string; role: string }

export default function PMSnagsPage() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()
  const [snags, setSnags] = useState<Snag[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SnagDetail | null>(null)
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([])
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([])
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [newOwner, setNewOwner] = useState('')
  const [reassigning, setReassigning] = useState(false)

  const loadSnags = useCallback(() => {
    if (!site) return
    setLoading(true)
    const url = filter
      ? `/api/snags?siteId=${site.id}&status=${filter}`
      : `/api/snags?siteId=${site.id}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => setSnags(d.snags || []))
      .catch(() => toast('Failed to load snags', 'error'))
      .finally(() => setLoading(false))
  }, [site, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!site) return
    loadSnags()
    fetch(`/api/users?siteId=${site.id}`)
      .then((r) => r.json())
      .then((d) => setSiteUsers(d.users || []))
      .catch(() => {})
  }, [site]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSnags()
  }, [filter, loadSnags])

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/snags/${id}`)
      if (!res.ok) throw new Error('Failed to load snag')
      const data = await res.json()
      setSelected(data.snag)
      setEvidence(data.evidence || [])
    } catch {
      toast('Failed to load snag details', 'error')
    }
  }

  const reassign = async () => {
    if (!selected || !newOwner) return
    setReassigning(true)
    try {
      const res = await fetch(`/api/snags/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: newOwner }),
      })
      if (res.ok) {
        const assignedUser = siteUsers.find((u) => u.id === newOwner)
        toast(`Snag reassigned to ${assignedUser?.displayName || 'user'}`, 'success')
        setNewOwner('')
        loadDetail(selected.id)
        loadSnags()
      } else {
        const data = await res.json()
        toast(data.error || 'Failed to reassign snag', 'error')
      }
    } catch {
      toast('Failed to reassign snag', 'error')
    } finally {
      setReassigning(false)
    }
  }

  const addComment = async () => {
    if (!selected || !comment.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/snags/${selected.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      })
      if (res.ok) {
        setComment('')
        toast('Comment added', 'success')
        loadDetail(selected.id)
      } else {
        const data = await res.json()
        toast(data.error || 'Failed to add comment', 'error')
      }
    } catch {
      toast('Failed to add comment', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Stats
  const openCount = snags.filter((s) => s.status === 'open').length
  const inProgressCount = snags.filter((s) => s.status === 'in_progress').length
  const closedCount = snags.filter((s) => s.status === 'closed').length

  // When filtering, show all-snag counts (need to compute from unfiltered)
  // We recompute from current snags if no filter, otherwise they reflect the filter
  const allSnags = filter === '' ? snags : snags // counts are only accurate when unfiltered

  if (siteLoading) {
    return <LoadingSkeleton lines={4} />
  }

  if (!site) {
    return (
      <EmptyState
        icon="snag"
        title="No site selected"
        description="Select a site from the navigation bar to view snags."
      />
    )
  }

  // Detail view
  if (selected) {
    return (
      <div className="space-y-4 pb-8 animate-fade-in">
        <button
          onClick={() => { setSelected(null); setNewOwner('') }}
          className="text-sm text-brand-600 hover:underline flex items-center gap-1"
        >
          &larr; Back to snags
        </button>

        {/* Snag details */}
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-800">{selected.title}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`badge-${selected.category}`}>{selected.category}</span>
                <span className={`badge-${selected.status.replace('_', '-')}`}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-line">{selected.description}</p>

          <div className="flex flex-col gap-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span>
                <span className="font-medium text-gray-600">Created by:</span>{' '}
                {selected.createdBy.displayName}
              </span>
              <span>
                <span className="font-medium text-gray-600">Assigned to:</span>{' '}
                {selected.owner.displayName}
              </span>
            </div>
            <span>
              <span className="font-medium text-gray-600">Created:</span>{' '}
              {new Date(selected.createdAt).toLocaleString('en-ZA')}
            </span>
          </div>

          {/* Reassign owner */}
          {selected.status !== 'closed' && (
            <div className="pt-3 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Reassign Owner
              </label>
              <div className="flex gap-2">
                <select
                  className="input-field text-sm flex-1"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                >
                  <option value="">Select new owner...</option>
                  {siteUsers
                    .filter((u) => u.id !== selected.owner.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.role})
                      </option>
                    ))}
                </select>
                <button
                  onClick={reassign}
                  className="btn-secondary text-sm"
                  disabled={!newOwner || reassigning}
                >
                  {reassigning ? 'Reassigning...' : 'Reassign'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Evidence */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Evidence</h2>
            <span className="text-xs text-gray-400">
              {evidence.length} item{evidence.length !== 1 ? 's' : ''}
            </span>
          </div>
          <EvidenceList evidence={evidence as never[]} />
        </div>

        {/* Comments */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Comments</h2>
            <span className="text-xs text-gray-400">
              {selected.comments?.length || 0} comment{(selected.comments?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          {(!selected.comments || selected.comments.length === 0) && (
            <p className="text-sm text-gray-400 italic">No comments yet</p>
          )}

          {selected.comments?.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{c.createdBy.displayName}</span>
                <span className="badge bg-gray-100 text-gray-500 text-xs capitalize">
                  {c.createdBy.role}
                </span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
              <p className="text-xs text-gray-400 mt-1.5">
                {new Date(c.createdAt).toLocaleString('en-ZA')}
              </p>
            </div>
          ))}

          {/* Add comment */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <input
              className="input-field text-sm flex-1"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={(e) => e.key === 'Enter' && !submittingComment && addComment()}
            />
            <button
              onClick={addComment}
              className="btn-primary text-sm"
              disabled={!comment.trim() || submittingComment}
            >
              {submittingComment ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Snags Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{site.name}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className={`text-2xl font-bold ${openCount > 0 ? 'text-safety-red' : 'text-gray-400'}`}>
            {openCount}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Open</p>
        </div>
        <div className="stat-card text-center">
          <p className={`text-2xl font-bold ${inProgressCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {inProgressCount}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-safety-green">{closedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Closed</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'closed', label: 'Closed' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Snag list */}
      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : snags.length === 0 ? (
        <EmptyState
          icon="snag"
          title={filter ? `No ${filter.replace('_', ' ')} snags` : 'No snags found'}
          description={
            filter
              ? 'Try a different filter or check back later.'
              : 'Snags raised by foremen will appear here.'
          }
        />
      ) : (
        <div className="space-y-2">
          {snags.map((s) => (
            <button
              key={s.id}
              onClick={() => loadDetail(s.id)}
              className={`card w-full text-left transition-colors ${
                s.category === 'safety' && s.status === 'open'
                  ? 'border-red-200 hover:border-red-300 bg-red-50/30'
                  : 'hover:border-brand-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800 truncate">{s.title}</h3>
                    {s.category === 'safety' && s.status === 'open' && (
                      <span className="text-xs font-bold text-red-600 flex-shrink-0">URGENT</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`badge-${s.category}`}>{s.category}</span>
                    <span className="text-xs text-gray-500">
                      {s.owner.displayName}
                    </span>
                    {(s._count?.comments || 0) > 0 && (
                      <span className="text-xs text-gray-400">
                        {s._count?.comments} comment{(s._count?.comments || 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`badge-${s.status.replace('_', '-')}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
