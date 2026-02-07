'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import EvidenceUpload from '@/components/EvidenceUpload'
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

type SiteUser = {
  id: string
  displayName: string
  role: string
}

function SnagListInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const siteId = searchParams.get('siteId')

  const [snags, setSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSnag, setSelectedSnag] = useState<string | null>(null)
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([])
  const [filter, setFilter] = useState<string>('')

  // Create form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('quality')
  const [ownerId, setOwnerId] = useState('')
  const [creating, setCreating] = useState(false)

  // Detail view
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [detailEvidence, setDetailEvidence] = useState<Record<string, unknown>[]>([])
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!siteId) return
    loadSnags()
    fetch(`/api/users?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => setSiteUsers(data.users || []))
  }, [siteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSnags = () => {
    if (!siteId) return
    setLoading(true)
    const url = filter ? `/api/snags?siteId=${siteId}&status=${filter}` : `/api/snags?siteId=${siteId}`
    fetch(url)
      .then((r) => r.json())
      .then((data) => setSnags(data.snags || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSnags() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = async (snagId: string) => {
    const res = await fetch(`/api/snags/${snagId}`)
    const data = await res.json()
    setDetail(data.snag)
    setDetailEvidence(data.evidence || [])
    setSelectedSnag(snagId)
  }

  const createSnag = async () => {
    if (!siteId || !title || !description || !ownerId) return
    setCreating(true)
    try {
      const res = await fetch('/api/snags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, title, description, category, ownerId }),
      })
      if (res.ok) {
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setCategory('quality')
        setOwnerId('')
        loadSnags()
      }
    } finally {
      setCreating(false)
    }
  }

  const updateStatus = async (snagId: string, newStatus: string) => {
    const res = await fetch(`/api/snags/${snagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'Failed to update status')
      return
    }
    loadSnags()
    if (selectedSnag === snagId) loadDetail(snagId)
  }

  const addComment = async (snagId: string) => {
    if (!comment.trim()) return
    await fetch(`/api/snags/${snagId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    })
    setComment('')
    loadDetail(snagId)
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

  // Detail view
  if (selectedSnag && detail) {
    const d = detail as Snag & { comments: Array<{ id: string; content: string; createdAt: string; createdBy: { displayName: string; role: string } }> }
    return (
      <div className="space-y-4 pb-8">
        <button onClick={() => setSelectedSnag(null)} className="text-sm text-brand-600 hover:underline">
          &larr; Back to snags
        </button>

        <div className="card space-y-3">
          <div className="flex items-start justify-between">
            <h1 className="text-lg font-bold text-gray-800">{d.title}</h1>
            <span className={`badge-${d.status.replace('_', '-')}`}>{d.status.replace('_', ' ')}</span>
          </div>
          <span className={`badge-${d.category}`}>{d.category}</span>
          <p className="text-sm text-gray-700">{d.description}</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>Created by {d.createdBy?.displayName}</span>
            <span>Assigned to {d.owner?.displayName}</span>
          </div>

          {d.status !== 'closed' && (
            <div className="flex gap-2 pt-2">
              {d.status === 'open' && (
                <button onClick={() => updateStatus(d.id, 'in_progress')} className="btn-secondary text-sm">
                  Start Work
                </button>
              )}
              {d.status === 'in_progress' && (
                <>
                  <button onClick={() => updateStatus(d.id, 'open')} className="btn-secondary text-sm">
                    Reopen
                  </button>
                  <button onClick={() => updateStatus(d.id, 'closed')} className="btn-primary text-sm">
                    Close Snag
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Evidence */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Evidence</h2>
          <EvidenceList evidence={detailEvidence as never[]} />
          {d.status !== 'closed' && (
            <EvidenceUpload
              siteId={siteId}
              contextType="snag"
              contextId={d.id}
              onUpload={(e) => setDetailEvidence((prev) => [...prev, e])}
            />
          )}
        </div>

        {/* Comments */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Comments</h2>
          {d.comments?.length === 0 && <p className="text-sm text-gray-400 italic">No comments yet</p>}
          {d.comments?.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{c.createdBy.displayName}</span>
                <span className="text-xs text-gray-400">{c.createdBy.role}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="input-field text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={(e) => e.key === 'Enter' && addComment(d.id)}
            />
            <button onClick={() => addComment(d.id)} className="btn-secondary text-sm" disabled={!comment.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Snags</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + New Snag
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'open', 'in_progress', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f === '' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">New Snag</h2>
          <input
            className="input-field"
            placeholder="Snag title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="textarea-field"
            rows={3}
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="safety">Safety</option>
              <option value="quality">Quality</option>
              <option value="rework">Rework</option>
              <option value="other">Other</option>
            </select>
            <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Assign to...</option>
              {siteUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={createSnag}
              className="btn-primary flex-1"
              disabled={creating || !title || !description || !ownerId}
            >
              {creating ? 'Creating...' : 'Create Snag'}
            </button>
          </div>
        </div>
      )}

      {/* Snag list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 animate-pulse">Loading snags...</div>
      ) : snags.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No snags found</div>
      ) : (
        <div className="space-y-2">
          {snags.map((snag) => (
            <button
              key={snag.id}
              onClick={() => loadDetail(snag.id)}
              className="card w-full text-left hover:border-brand-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-800 truncate">{snag.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{snag.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge-${snag.category}`}>{snag.category}</span>
                    <span className="text-xs text-gray-400">Assigned to {snag.owner.displayName}</span>
                  </div>
                </div>
                <span className={`badge-${snag.status.replace('_', '-')} flex-shrink-0`}>
                  {snag.status.replace('_', ' ')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SnagListPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-400 animate-pulse">Loading...</div>}>
      <SnagListInner />
    </Suspense>
  )
}
