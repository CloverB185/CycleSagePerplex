'use client'

import { useSite } from '@/components/SiteProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import EvidenceUpload from '@/components/EvidenceUpload'
import EvidenceList from '@/components/EvidenceList'
import { useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import {
  ArrowLeft,
  Plus,
  X,
  AlertTriangle,
  Camera,
  MessageSquare,
  ChevronRight,
  Play,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'

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

type SiteUser = {
  id: string
  displayName: string
  role: string
}

const categoryColors: Record<string, { border: string }> = {
  safety: { border: 'border-l-red-500' },
  quality: { border: 'border-l-blue-500' },
  rework: { border: 'border-l-amber-500' },
  other: { border: 'border-l-site-400' },
}

export default function SnagListPage() {
  const { site, loading: siteLoading } = useSite()
  const { toast } = useToast()

  // List state
  const [snags, setSnags] = useState<Snag[]>([])
  const [allSnags, setAllSnags] = useState<Snag[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([])

  // Summary counts
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, closed: 0 })

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('quality')
  const [ownerId, setOwnerId] = useState('')
  const [creating, setCreating] = useState(false)

  // Detail view state
  const [selectedSnag, setSelectedSnag] = useState<string | null>(null)
  const [detail, setDetail] = useState<SnagDetail | null>(null)
  const [detailEvidence, setDetailEvidence] = useState<Record<string, unknown>[]>([])
  const [comment, setComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  // Load snags
  const loadSnags = useCallback(async () => {
    if (!site) return
    setLoading(true)
    try {
      const url = filter
        ? `/api/snags?siteId=${site.id}&status=${filter}`
        : `/api/snags?siteId=${site.id}`
      const res = await fetch(url)
      const data = await res.json()
      const fetchedSnags: Snag[] = data.snags || []
      setSnags(fetchedSnags)

      if (!filter) {
        setAllSnags(fetchedSnags)
        const open = fetchedSnags.filter((s) => s.status === 'open').length
        const ip = fetchedSnags.filter((s) => s.status === 'in_progress').length
        const closed = fetchedSnags.filter((s) => s.status === 'closed').length
        setCounts({ open, in_progress: ip, closed })
      }
    } catch {
      toast('Failed to load snags', 'error')
    } finally {
      setLoading(false)
    }
  }, [site, filter, toast])

  const loadCounts = useCallback(async () => {
    if (!site || !filter) return
    try {
      const res = await fetch(`/api/snags?siteId=${site.id}`)
      const data = await res.json()
      const all: Snag[] = data.snags || []
      setAllSnags(all)
      const open = all.filter((s) => s.status === 'open').length
      const ip = all.filter((s) => s.status === 'in_progress').length
      const closed = all.filter((s) => s.status === 'closed').length
      setCounts({ open, in_progress: ip, closed })
    } catch {
      // silently fail for counts
    }
  }, [site, filter])

  const loadUsers = useCallback(async () => {
    if (!site) return
    try {
      const res = await fetch(`/api/users?siteId=${site.id}`)
      const data = await res.json()
      setSiteUsers(data.users || [])
    } catch {
      // silently fail
    }
  }, [site])

  useEffect(() => {
    loadSnags()
    loadUsers()
  }, [loadSnags, loadUsers])

  useEffect(() => {
    if (filter) loadCounts()
  }, [filter, loadCounts])

  // Load snag detail
  const loadDetail = async (snagId: string) => {
    try {
      const res = await fetch(`/api/snags/${snagId}`)
      const data = await res.json()
      if (res.ok) {
        setDetail(data.snag as SnagDetail)
        setDetailEvidence(data.evidence || [])
        setSelectedSnag(snagId)
      } else {
        toast('Failed to load snag details', 'error')
      }
    } catch {
      toast('Network error', 'error')
    }
  }

  // Create snag
  const createSnag = async () => {
    if (!site || !title || !description || !ownerId) return
    setCreating(true)
    try {
      const res = await fetch('/api/snags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id, title, description, category, ownerId }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setCategory('quality')
        setOwnerId('')
        toast('Snag created', 'success')
        loadSnags()
      } else {
        toast(data.error || 'Failed to create snag', 'error')
      }
    } catch {
      toast('Network error while creating', 'error')
    } finally {
      setCreating(false)
    }
  }

  // Update snag status
  const updateStatus = async (snagId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/snags/${snagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error || 'Failed to update status', 'error')
        return
      }
      const label = newStatus === 'in_progress' ? 'In Progress' : newStatus === 'closed' ? 'Closed' : 'Open'
      toast(`Snag moved to ${label}`, 'success')
      loadSnags()
      if (selectedSnag === snagId) loadDetail(snagId)
    } catch {
      toast('Network error', 'error')
    }
  }

  // Add comment
  const handleAddComment = async (snagId: string) => {
    if (!comment.trim()) return
    setAddingComment(true)
    try {
      const res = await fetch(`/api/snags/${snagId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      })
      if (res.ok) {
        setComment('')
        toast('Comment added', 'success')
        loadDetail(snagId)
      } else {
        const data = await res.json()
        toast(data.error || 'Failed to add comment', 'error')
      }
    } catch {
      toast('Network error', 'error')
    } finally {
      setAddingComment(false)
    }
  }

  // Loading states
  if (siteLoading) {
    return <LoadingSkeleton lines={4} />
  }

  if (!site) {
    return (
      <EmptyState
        icon="snag"
        title="No site selected"
        description="Select a site from the navigation bar to get started."
      />
    )
  }

  // ==================== DETAIL VIEW ====================
  if (selectedSnag && detail) {
    return (
      <div className="space-y-4 pb-8 animate-fade-in px-4 pt-4">
        <button
          onClick={() => {
            setSelectedSnag(null)
            setDetail(null)
          }}
          className="text-mobile-sm text-brand-600 hover:underline flex items-center gap-1.5 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to snags
        </button>

        {/* Snag Header Card */}
        <div className={clsx(
          'card space-y-3 border-l-4',
          categoryColors[detail.category]?.border || 'border-l-site-400'
        )}>
          <div className="flex items-start justify-between">
            <h1 className="text-mobile-lg font-bold text-site-800">{detail.title}</h1>
            <span className={`badge-${detail.status.replace('_', '-')}`}>{detail.status.replace('_', ' ')}</span>
          </div>
          <span className={`badge-${detail.category}`}>{detail.category}</span>
          <p className="text-mobile-sm text-site-700">{detail.description}</p>
          <div className="flex gap-4 text-mobile-xs text-site-400">
            <span>Created by {detail.createdBy?.displayName}</span>
            <span>Assigned to {detail.owner?.displayName}</span>
          </div>

          {/* Status actions */}
          {detail.status !== 'closed' && (
            <div className="flex gap-2 pt-2 border-t border-site-100">
              {detail.status === 'open' && (
                <button
                  onClick={() => updateStatus(detail.id, 'in_progress')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Work
                </button>
              )}
              {detail.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => updateStatus(detail.id, 'open')}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reopen
                  </button>
                  <button
                    onClick={() => updateStatus(detail.id, 'closed')}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Close Snag
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-site-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-site-400" />
            Timeline
          </h2>
          <div className="relative pl-6">
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-site-200" />

            {/* Created event */}
            <div className="relative mb-4">
              <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full bg-brand-100 border-2 border-brand-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              </div>
              <div className="ml-2">
                <p className="text-mobile-sm font-medium text-site-700">Snag created</p>
                <p className="text-mobile-xs text-site-400">
                  {detail.createdBy?.displayName} &middot; {new Date(detail.createdAt).toLocaleString('en-ZA')}
                </p>
              </div>
            </div>

            {/* Comments as timeline events */}
            {detail.comments?.map((c) => (
              <div key={c.id} className="relative mb-4">
                <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full bg-site-100 border-2 border-site-300 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-site-400" />
                </div>
                <div className="ml-2 bg-site-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-mobile-sm font-medium">{c.createdBy.displayName}</span>
                    <span className="text-mobile-xs text-site-400 capitalize">{c.createdBy.role}</span>
                  </div>
                  <p className="text-mobile-sm text-site-700">{c.content}</p>
                  <p className="text-mobile-xs text-site-400 mt-1">{new Date(c.createdAt).toLocaleString('en-ZA')}</p>
                </div>
              </div>
            ))}

            {/* Closed event */}
            {detail.status === 'closed' && (
              <div className="relative mb-4">
                <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-2.5 h-2.5 text-green-600" />
                </div>
                <div className="ml-2">
                  <p className="text-mobile-sm font-medium text-green-700">Snag closed</p>
                </div>
              </div>
            )}
          </div>

          {/* Add comment */}
          {detail.status !== 'closed' && (
            <div className="flex gap-2 pt-2 border-t border-site-100">
              <input
                className="input-field"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => e.key === 'Enter' && !addingComment && handleAddComment(detail.id)}
              />
              <button
                onClick={() => handleAddComment(detail.id)}
                className="btn-brand whitespace-nowrap"
                disabled={!comment.trim() || addingComment}
              >
                {addingComment ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
        </div>

        {/* Evidence */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-site-800 flex items-center gap-2">
            <Camera className="w-4 h-4 text-site-400" />
            Evidence
            {detailEvidence.length > 0 && (
              <span className="badge bg-brand-100 text-brand-700 text-mobile-xs">{detailEvidence.length}</span>
            )}
          </h2>
          <EvidenceList evidence={detailEvidence as never[]} />
          {detail.status !== 'closed' && (
            <EvidenceUpload
              siteId={site.id}
              contextType="snag"
              contextId={detail.id}
              onUpload={(e) => {
                setDetailEvidence((prev) => [...prev, e])
                toast('Evidence uploaded', 'success')
              }}
            />
          )}
        </div>
      </div>
    )
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-4 pb-8 animate-fade-in px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-mobile-xl font-bold text-site-800">Snags</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Snag
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card">
          <AlertTriangle className={clsx('w-4 h-4 mx-auto mb-1', counts.open > 0 ? 'text-safety-red' : 'text-site-400')} />
          <p className={clsx('text-mobile-xl font-bold', counts.open > 0 ? 'text-safety-red' : 'text-site-400')}>{counts.open}</p>
          <p className="text-mobile-xs text-site-500">Open</p>
        </div>
        <div className="stat-card">
          <div className={clsx('w-4 h-4 mx-auto mb-1 rounded-full', counts.in_progress > 0 ? 'bg-amber-400' : 'bg-site-300')} />
          <p className={clsx('text-mobile-xl font-bold', counts.in_progress > 0 ? 'text-amber-500' : 'text-site-400')}>{counts.in_progress}</p>
          <p className="text-mobile-xs text-site-500">In Progress</p>
        </div>
        <div className="stat-card">
          <CheckCircle2 className={clsx('w-4 h-4 mx-auto mb-1', counts.closed > 0 ? 'text-safety-green' : 'text-site-400')} />
          <p className={clsx('text-mobile-xl font-bold', counts.closed > 0 ? 'text-safety-green' : 'text-site-400')}>{counts.closed}</p>
          <p className="text-mobile-xs text-site-500">Closed</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { value: '', label: 'All', count: allSnags.length },
          { value: 'open', label: 'Open', count: counts.open },
          { value: 'in_progress', label: 'In Progress', count: counts.in_progress },
          { value: 'closed', label: 'Closed', count: counts.closed },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              'px-4 py-2 rounded-full text-mobile-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 min-h-touch',
              filter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-site-600 border border-site-200 hover:border-site-300'
            )}
          >
            {f.label}
            <span className={clsx('text-mobile-xs', filter === f.value ? 'text-brand-200' : 'text-site-400')}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Create Snag Form */}
      {showCreate && (
        <div className="card space-y-3 border-l-4 border-l-brand-500 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-mobile-lg font-semibold text-site-800">New Snag</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-site-400 hover:text-site-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">
              Title <span className="text-safety-red">*</span>
            </label>
            <input
              className="input-field"
              placeholder="Brief snag title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">
              Description <span className="text-safety-red">*</span>
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="rework">Rework</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-mobile-sm font-medium text-site-700 mb-1.5">
                Assign to <span className="text-safety-red">*</span>
              </label>
              <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                <option value="">Select person...</option>
                {siteUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={createSnag}
              className="btn-primary flex-1"
              disabled={creating || !title.trim() || !description.trim() || !ownerId}
            >
              {creating ? 'Creating...' : 'Create Snag'}
            </button>
          </div>
        </div>
      )}

      {/* Snag List */}
      {loading ? (
        <LoadingSkeleton lines={4} />
      ) : snags.length === 0 ? (
        <EmptyState
          icon="snag"
          title={filter ? `No ${filter.replace('_', ' ')} snags` : 'No snags yet'}
          description={filter ? 'Try changing the filter to see other snags.' : 'Create your first snag to start tracking issues on site.'}
          action={
            filter
              ? { label: 'Show All', onClick: () => setFilter('') }
              : { label: 'Create Snag', onClick: () => setShowCreate(true) }
          }
        />
      ) : (
        <div className="space-y-2">
          {snags.map((snag) => {
            const colors = categoryColors[snag.category] || categoryColors.other
            return (
              <button
                key={snag.id}
                onClick={() => loadDetail(snag.id)}
                className={clsx(
                  'card w-full text-left hover:border-brand-300 active:scale-[0.98] transition-all border-l-4',
                  colors.border
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-mobile-sm font-medium text-site-800 truncate">{snag.title}</h3>
                    <p className="text-mobile-xs text-site-500 truncate">{snag.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`badge-${snag.category}`}>{snag.category}</span>
                      <span className="text-mobile-xs text-site-400">
                        {snag.owner.displayName}
                      </span>
                      {snag._count && snag._count.comments > 0 && (
                        <span className="text-mobile-xs text-site-400 flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          {snag._count.comments}
                        </span>
                      )}
                    </div>
                    <p className="text-mobile-xs text-site-400 mt-1">
                      {new Date(snag.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge-${snag.status.replace('_', '-')}`}>
                      {snag.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-site-300" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
