'use client'

type EvidenceItem = {
  id: string
  evidenceType: string
  fileUrl?: string | null
  fileName?: string | null
  description?: string | null
  deviceTimestamp: string
  createdBy?: { displayName: string }
}

type Props = {
  evidence: EvidenceItem[]
  compact?: boolean
}

export default function EvidenceList({ evidence, compact }: Props) {
  if (evidence.length === 0) {
    return <p className="text-sm text-gray-400 italic">No evidence attached</p>
  }

  return (
    <div className={compact ? 'flex gap-2 flex-wrap' : 'space-y-2'}>
      {evidence.map((e) => (
        <div key={e.id} className={compact ? '' : 'flex items-start gap-3 p-2 bg-gray-50 rounded-lg'}>
          {e.evidenceType === 'photo' && e.fileUrl ? (
            compact ? (
              <img
                src={e.fileUrl}
                alt={e.description || 'Evidence photo'}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <>
                <img
                  src={e.fileUrl}
                  alt={e.description || 'Evidence photo'}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{e.fileName}</p>
                  {e.description && <p className="text-sm text-gray-500">{e.description}</p>}
                  <p className="text-xs text-gray-400">
                    {new Date(e.deviceTimestamp).toLocaleString()}
                  </p>
                </div>
              </>
            )
          ) : (
            <div className={compact ? 'bg-blue-50 p-2 rounded-lg text-sm max-w-48' : 'min-w-0'}>
              <p className="text-sm text-gray-700">{e.description}</p>
              {!compact && (
                <p className="text-xs text-gray-400 mt-1">
                  Note &middot; {new Date(e.deviceTimestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
