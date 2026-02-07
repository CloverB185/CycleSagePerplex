'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'

type Site = {
  id: string
  name: string
  address?: string | null
  isTestSite: boolean
  isActive: boolean
}

type UserInfo = {
  id: string
  displayName: string
  email: string
  role: string
  isActive?: boolean
}

type AuditEntry = {
  id: string
  entityType: string
  entityId: string
  action: string
  performedBy: { displayName: string }
  serverTimestamp: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'users' | 'audit'>('overview')

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [sitesRes, usersRes, auditRes] = await Promise.all([
        fetch('/api/sites').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/admin/audit-logs').then((r) => r.json()).catch(() => ({ logs: [] })),
      ])

      const allSites: Site[] = sitesRes.sites || []
      setSites(allSites)
      setUsers(usersRes.users || [])
      setAuditLogs(auditRes.logs || [])

      const counts: Record<string, number> = {}
      await Promise.all(
        allSites.map(async (s) => {
          try {
            const res = await fetch(`/api/daily-reports?siteId=${s.id}`)
            const data = await res.json()
            counts[s.id] = (data.reports || []).length
          } catch {
            counts[s.id] = 0
          }
        })
      )
      setReportCounts(counts)
    } catch {
      toast('Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalReports = Object.values(reportCounts).reduce((sum, c) => sum + c, 0)
  const testSites = sites.filter((s) => s.isTestSite).length
  const liveSites = sites.filter((s) => !s.isTestSite).length

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'sites' as const, label: `Sites (${sites.length})` },
    { key: 'users' as const, label: `Users (${users.length})` },
    { key: 'audit' as const, label: 'Audit Log' },
  ]

  if (loading) return <LoadingSkeleton lines={5} />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organization overview and management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card">
              <p className="text-3xl font-bold text-brand-600">{sites.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total Sites</p>
              <p className="text-xs text-gray-400">{liveSites} live, {testSites} test</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-brand-600">{users.length}</p>
              <p className="text-sm text-gray-500 mt-1">Active Users</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-brand-600">{totalReports}</p>
              <p className="text-sm text-gray-500 mt-1">Total Reports</p>
            </div>
            <div className="stat-card">
              <p className="text-3xl font-bold text-brand-600">{auditLogs.length}</p>
              <p className="text-sm text-gray-500 mt-1">Audit Events</p>
            </div>
          </div>

          {/* Role Breakdown */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">User Roles</h2>
            <div className="space-y-2">
              {['admin', 'pm', 'foreman'].map((role) => {
                const count = users.filter((u) => u.role === role).length
                const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 capitalize w-20">{role}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          role === 'admin' ? 'bg-purple-500' :
                          role === 'pm' ? 'bg-blue-500' :
                          'bg-brand-500'
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Audit */}
          {auditLogs.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Recent Activity</h2>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    <span className={`badge mt-0.5 ${
                      log.action === 'create' ? 'bg-green-100 text-green-700' :
                      log.action === 'submit' ? 'bg-blue-100 text-blue-700' :
                      log.action === 'status_change' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-700">{log.performedBy?.displayName || 'System'}</span>
                      <span className="text-gray-400"> — {log.entityType}</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(log.serverTimestamp).toLocaleString('en-ZA', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{liveSites} live</span>
            <span className="text-gray-300">|</span>
            <span>{testSites} test</span>
          </div>
          {sites.length === 0 ? (
            <EmptyState icon="search" title="No sites" description="No sites configured yet." />
          ) : (
            <div className="space-y-2">
              {sites.map((s) => (
                <div key={s.id} className={`card ${s.isTestSite ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-800">{s.name}</h3>
                        {s.isTestSite ? (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">TEST</span>
                        ) : (
                          <span className="badge bg-green-100 text-green-700 text-xs">LIVE</span>
                        )}
                        {!s.isActive && (
                          <span className="badge bg-red-100 text-red-600 text-xs">INACTIVE</span>
                        )}
                      </div>
                      {s.address && <p className="text-xs text-gray-500 mt-0.5">{s.address}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-700">{reportCounts[s.id] || 0}</p>
                      <p className="text-xs text-gray-400">reports</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <EmptyState icon="search" title="No users" description="No users found." />
          ) : (
            users.map((u) => (
              <div key={u.id} className="card flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-800">{u.displayName}</h3>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className={`badge capitalize ${
                  u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  u.role === 'pm' ? 'bg-blue-100 text-blue-700' :
                  'bg-brand-100 text-brand-700'
                }`}>
                  {u.role}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No audit logs recorded yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        log.action === 'create' ? 'bg-green-100 text-green-700' :
                        log.action === 'submit' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'status_change' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">{log.entityType}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      by <span className="font-medium">{log.performedBy?.displayName || 'System'}</span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.serverTimestamp).toLocaleString('en-ZA', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
