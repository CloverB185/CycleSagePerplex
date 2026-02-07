'use client'

import { useEffect, useState } from 'react'
import SiteSelector from '@/components/SiteSelector'
import EvidenceList from '@/components/EvidenceList'

type Site = { id: string; name: string; isTestSite: boolean }

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
  const [site, setSite] = useState<Site | null>(null)
  const [snags, setSnags] = useState<Snag[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SnagDetail | null>(null)
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([])
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([])
  const [comment, setComment] = useState('')
  const [newOwner, setNewOwner] = useState('')

  useEffect(() => {
    if (!site) return
    loadSnags()
    fetch(`/api/users?siteId=${site.id}`).then((r) => r.json()).then((d) => setSiteUsers(d.users || []))
  }, [site]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSnags = () => {
    if (!site) return
    setLoading(true)
    const url = filter ? `/api/snags?siteId=${site.id}&status=${filter}` : `/api/snags?siteId=${site.id}`
    fetch(url).then((r) => r.json()).then((d) => setSnags(d.snags || [])).finally(() => setLoading(false))
  }

  useEffect(() => { loadSnags() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = async (id: string) => {
    const res = await fetch(`/api/snags/${id}`)
    const data = await res.json()
    setSelected(data.snag)
    setEvidence(data.evidence || [])
  }

  const reassign = async () => {
    if (!selected || !newOwner) return
    const res = await fetch(`/api/snags/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: newOwner }),
    })
    if (res.ok) {
      setNewOwner('')
      loadDetail(selected.id)
      loadSnags()
    }
  }

  const addComment = async () => {
    if (!selected || !comment.trim()) return
    await fetch(`/api/snags/${selected.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    })
    setComment('')
    loadDetail(selected.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Snags Overview</h1>
        <div className="w-56">
          <SiteSelector selectedSiteId={site?.id || null} onSelect={setSite} />
        </div>
      </div>

      {selected ? (
        <div className="space-y-4 pb-8">
          <button onClick={() => setSelected(null)} className="text-sm text-brand-600 hover:underline">
            &larr; Back to list
          </button>

          <div className="card space-y-3">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-gray-800">{selected.title}</h2>
              <span className={`badge-${selected.status.replace('_', '-')}`}>{selected.status.replace('_', ' ')}</span>
            </div>
            <span className={`badge-${selected.category}`}>{selected.category}</span>
            <p className="text-sm text-gray-700">{selected.description}</p>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>Created by {selected.createdBy.displayName}</span>
              <span>Assigned to {selected.owner.displayName}</span>
            </div>

            {/* Reassign owner */}
            {selected.status !== 'closed' && (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <select className="input-field text-sm" value={newOwner} onChange={(e) => setNewOwner(e.target.value)}>
                  <option value="">Reassign to...</option>
                  {siteUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>
                  ))}
                </select>
                <button onClick={reassign} className="btn-secondary text-sm" disabled={!newOwner}>
                  Reassign
                </button>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800">Evidence</h2>
            <EvidenceList evidence={evidence as never[]} />
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800">Comments</h2>
            {selected.comments?.length === 0 && <p className="text-sm text-gray-400 italic">No comments</p>}
            {selected.comments?.map((c) => (
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
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
              />
              <button onClick={addComment} className="btn-secondary text-sm" disabled={!comment.trim()}>Send</button>
            </div>
          </div>
        </div>
      ) : (
        <>
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

          {loading ? (
            <div className="text-center py-8 text-gray-400 animate-pulse">Loading...</div>
          ) : snags.length === 0 ? (
            <p className="text-center py-8 text-gray-400 italic">
              {site ? 'No snags found' : 'Select a site'}
            </p>
          ) : (
            <div className="space-y-2">
              {snags.map((s) => (
                <button key={s.id} onClick={() => loadDetail(s.id)} className="card w-full text-left hover:border-brand-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">{s.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge-${s.category}`}>{s.category}</span>
                        <span className="text-xs text-gray-400">
                          {s.createdBy.displayName} &rarr; {s.owner.displayName}
                        </span>
                      </div>
                    </div>
                    <span className={`badge-${s.status.replace('_', '-')} flex-shrink-0`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
