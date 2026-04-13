'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import {
  Building2,
  Users,
  FileText,
  Activity,
  Shield,
  AlertTriangle,
  TrendingUp,
  Crown,
} from 'lucide-react'

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

export default function OwnerPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({})
  const [snagCounts, setSnagCounts] = useState<Record<string, { open: number; total: number }>>({})
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

      const rCounts: Record<string, number> = {}
      const sCounts: Record<string, { open: number; total: number }> = {}
      await Promise.all(
        allSites.map(async (s) => {
          try {
            const [repRes, snagRes] = await Promise.all([
              fetch(`/api/daily-reports?siteId=${s.id}`).then((r) => r.json()),
              fetch(`/api/snags?siteId=${s.id}`).then((r) => r.json()),
            ])
            rCounts[s.id] = (repRes.reports || []).length
            const snags = snagRes.snags || []
            sCounts[s.id] = {
              total: snags.length,
              open: snags.filter((sn: { status: string }) => sn.status !== 'closed').length,
            }
          } catch {
            rCounts[s.id] = 0
            sCounts[s.id] = { open: 0, total: 0 }
          }
        })
      )
      setReportCounts(rCounts)
      setSnagCounts(sCounts)
    } catch {
      toast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalReports = Object.values(reportCounts).reduce((sum, c) => sum + c, 0)
  const totalSnags = Object.values(snagCounts).reduce((sum, c) => sum + c.total, 0)
  const openSnags = Object.values(snagCounts).reduce((sum, c) => sum + c.open, 0)
  const liveSites = sites.filter((s) => !s.isTestSite).length
  const testSites = sites.filter((s) => s.isTestSite).length

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'sites' as const, label: `Sites (${sites.length})` },
    { key: 'users' as const, label: `Users (${users.length})` },
    { key: 'audit' as const, label: 'Audit Log' },
  ]

  if (loading) return <LoadingSkeleton lines={5} />

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Crown className="w-6 h-6" />
          <h1 className="text-xl font-bold">Owner Dashboard</h1>
        </div>
        <p className="text-amber-100 text-sm">Full visibility across all sites and operations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-site-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-site-400 hover:text-site-600'
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
              <Building2 className="w-5 h-5 text-brand-500 mb-1" />
              <p className="text-3xl font-bold text-brand-600">{sites.length}</p>
              <p className="text-sm text-site-500 mt-1">Total Sites</p>
              <p className="text-xs text-site-400">{liveSites} live, {testSites} test</p>
            </div>
            <div className="stat-card">
              <Users className="w-5 h-5 text-brand-500 mb-1" />
              <p className="text-3xl font-bold text-brand-600">{users.length}</p>
              <p className="text-sm text-site-500 mt-1">Active Users</p>
            </div>
            <div className="stat-card">
              <FileText className="w-5 h-5 text-brand-500 mb-1" />
              <p className="text-3xl font-bold text-brand-600">{totalReports}</p>
              <p className="text-sm text-site-500 mt-1">Total Reports</p>
            </div>
            <div className="stat-card">
              <AlertTriangle className="w-5 h-5 text-construction-500 mb-1" />
              <p className="text-3xl font-bold text-construction-600">{openSnags}</p>
              <p className="text-sm text-site-500 mt-1">Open Snags</p>
              <p className="text-xs text-site-400">{totalSnags} total</p>
            </div>
          </div>

          {/* Role Breakdown */}
          <div className="card">
            <h2 className="text-sm font-semibold text-site-600 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> User Roles
            </h2>
            <div className="space-y-2">
              {['owner', 'admin', 'pm', 'foreman'].map((role) => {
                const count = users.filter((u) => u.role === role).length
                const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-site-700 capitalize w-20">{role}</span>
                    <div className="flex-1 bg-site-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          role === 'owner' ? 'bg-amber-500' :
                          role === 'admin' ? 'bg-purple-500' :
                          role === 'pm' ? 'bg-blue-500' :
                          'bg-brand-500'
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="text-sm text-site-500 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          {auditLogs.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-site-600 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Recent Activity
              </h2>
              <div className="space-y-2">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    <span className={`badge mt-0.5 ${
                      log.action === 'create' ? 'bg-green-100 text-green-700' :
                      log.action === 'submit' ? 'bg-blue-100 text-blue-700' :
                      log.action === 'status_change' ? 'bg-amber-100 text-amber-700' :
                      log.action === 'login' ? 'bg-brand-100 text-brand-700' :
                      'bg-site-100 text-site-700'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-site-700">{log.performedBy?.displayName || 'System'}</span>
                      <span className="text-site-400"> - {log.entityType}</span>
                    </div>
                    <span className="text-xs text-site-400 flex-shrink-0">
                      {new Date(log.serverTimestamp).toLocaleString('en-ZA', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Site Performance */}
          <div className="card">
            <h2 className="text-sm font-semibold text-site-600 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Site Performance
            </h2>
            <div className="space-y-3">
              {sites.filter((s) => !s.isTestSite).map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-site-700 truncate flex-1">{s.name}</span>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-brand-600">{reportCounts[s.id] || 0}</p>
                      <p className="text-[10px] text-site-400">reports</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-construction-600">{snagCounts[s.id]?.open || 0}</p>
                      <p className="text-[10px] text-site-400">open snags</p>
                    </div>
                  </div>
                </div>
              ))}
              {sites.filter((s) => !s.isTestSite).length === 0 && (
                <p className="text-sm text-site-400 text-center py-4">No live sites yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-site-500">
            <span>{liveSites} live</span>
            <span className="text-site-300">|</span>
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
                        <h3 className="text-sm font-medium text-site-800">{s.name}</h3>
                        {s.isTestSite ? (
                          <span className="badge bg-amber-100 text-amber-700 text-xs">TEST</span>
                        ) : (
                          <span className="badge bg-green-100 text-green-700 text-xs">LIVE</span>
                        )}
                        {!s.isActive && (
                          <span className="badge bg-red-100 text-red-600 text-xs">INACTIVE</span>
                        )}
                      </div>
                      {s.address && <p className="text-xs text-site-500 mt-0.5">{s.address}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-site-700">{reportCounts[s.id] || 0}</p>
                      <p className="text-xs text-site-400">reports</p>
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
                  <h3 className="text-sm font-medium text-site-800">{u.displayName}</h3>
                  <p className="text-xs text-site-500">{u.email}</p>
                </div>
                <span className={`badge capitalize ${
                  u.role === 'owner' ? 'bg-amber-100 text-amber-700' :
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
            <p className="text-sm text-site-400 text-center py-8">No audit logs recorded yet.</p>
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
                        log.action === 'login' ? 'bg-brand-100 text-brand-700' :
                        'bg-site-100 text-site-700'
                      }`}>
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-site-500 capitalize">{log.entityType}</span>
                    </div>
                    <p className="text-sm text-site-700 mt-1">
                      by <span className="font-medium">{log.performedBy?.displayName || 'System'}</span>
                    </p>
                  </div>
                  <span className="text-xs text-site-400 flex-shrink-0">
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
