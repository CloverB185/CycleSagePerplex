'use client'

import { useAuth } from './AuthProvider'
import { useSite } from './SiteProvider'
import { useRouter, usePathname } from 'next/navigation'

export default function NavBar() {
  const { user, logout } = useAuth()
  const { site, sites, selectSite } = useSite()
  const router = useRouter()
  const pathname = usePathname()

  if (!user) return null

  const roleHome = user.role === 'foreman' ? '/foreman' : '/pm'

  const foremanLinks = [
    { href: '/foreman', label: 'Dashboard' },
    { href: '/foreman/daily-report', label: 'Daily Report' },
    { href: '/foreman/snags', label: 'Snags' },
    { href: '/foreman/tomorrow-plan', label: 'Tomorrow Plan' },
  ]

  const pmLinks = [
    { href: '/pm', label: 'Dashboard' },
    { href: '/pm/reports', label: 'Reports' },
    { href: '/pm/snags', label: 'Snags' },
  ]

  const adminLinks = [
    { href: '/pm', label: 'Dashboard' },
    { href: '/pm/reports', label: 'Reports' },
    { href: '/pm/snags', label: 'Snags' },
    { href: '/admin', label: 'Admin' },
  ]

  const links = user.role === 'foreman' ? foremanLinks : user.role === 'admin' ? adminLinks : pmLinks

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(roleHome)}
              className="font-bold text-brand-700 text-lg"
            >
              OnsitePro Claude
            </button>
            <span className="badge bg-brand-100 text-brand-700 text-xs capitalize">
              {user.role}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {sites.length > 0 && (
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 max-w-[180px] truncate"
                value={site?.id || ''}
                onChange={(e) => {
                  const s = sites.find((s) => s.id === e.target.value)
                  if (s) selectSite(s)
                }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.isTestSite ? '[TEST] ' : ''}{s.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-sm text-gray-500 hidden sm:block">{user.displayName}</span>
            <button
              onClick={async () => { await logout(); router.push('/') }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex gap-1 -mb-px overflow-x-auto">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/foreman' && link.href !== '/pm' && pathname.startsWith(link.href + '/'))
            return (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {link.label}
              </button>
            )
          })}
        </div>
      </div>

      {site?.isTestSite && (
        <div className="bg-amber-400 text-amber-900 text-center text-xs font-bold py-1 tracking-wide">
          TEST MODE — Data will not affect production
        </div>
      )}
    </nav>
  )
}
