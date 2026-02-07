'use client'

import { useState, useRef } from 'react'

type Props = {
  siteId: string
  contextType: string
  contextId?: string
  onUpload: (evidence: Record<string, unknown>) => void
}

export default function EvidenceUpload({ siteId, contextType, contextId, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('siteId', siteId)
      formData.append('evidenceType', 'photo')
      formData.append('contextType', contextType)
      if (contextId) formData.append('contextId', contextId)
      if (description) formData.append('description', description)
      formData.append('deviceTimestamp', new Date().toISOString())

      const res = await fetch('/api/evidence', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        onUpload(data.evidence)
        setDescription('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  const addNote = async () => {
    if (!description.trim()) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('siteId', siteId)
      formData.append('evidenceType', 'note')
      formData.append('contextType', contextType)
      if (contextId) formData.append('contextId', contextId)
      formData.append('description', description)
      formData.append('deviceTimestamp', new Date().toISOString())

      const res = await fetch('/api/evidence', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        onUpload(data.evidence)
        setDescription('')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary flex items-center gap-2 text-sm"
          disabled={uploading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {uploading ? 'Uploading...' : 'Add Photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="input-field text-sm"
          placeholder="Add a note as evidence..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
        />
        <button
          type="button"
          onClick={addNote}
          className="btn-secondary text-sm whitespace-nowrap"
          disabled={uploading || !description.trim()}
        >
          Add Note
        </button>
      </div>
    </div>
  )
}
