'use client'

import { useAuth } from './AuthProvider'
import { useSite } from './SiteProvider'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  CalendarClock,
  FileText,
  Users,
  Shield,
  HardHat,
  MapPin,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'

type NavLink = {
  href: string
  label: string
  icon: LucideIcon
}

export default function NavBar() {
  const { user, logout } = useAuth()
  const { site, sites, selectSite } = useSite()
  const router = useRouter()
  const pathname = usePathname()

  if (!user) return null

  const roleHome = user.role === 'foreman' ? '/foreman' : '/pm'

  const foremanLinks: NavLink[] = [
    { href: '/foreman', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/foreman/daily-report', label: 'Report', icon: ClipboardList },
    { href: '/foreman/snags', label: 'Snags', icon: AlertTriangle },
    { href: '/foreman/tomorrow-plan', label: 'Plan', icon: CalendarClock },
  ]

  const pmLinks: NavLink[] = [
    { href: '/pm', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pm/reports', label: 'Reports', icon: FileText },
    { href: '/pm/snags', label: 'Snags', icon: AlertTriangle },
  ]

  const adminLinks: NavLink[] = [
    { href: '/pm', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pm/reports', label: 'Reports', icon: FileText },
    { href: '/pm/snags', label: 'Snags', icon: AlertTriangle },
    { href: '/admin', label: 'Admin', icon: Shield },
  ]

  const links = user.role === 'foreman' ? foremanLinks : user.role === 'admin' ? adminLinks : pmLinks

  const roleBadgeStyles: Record<string, string> = {
    foreman: 'bg-construction-100 text-construction-700 border-construction-200',
    pm: 'bg-brand-100 text-brand-700 border-brand-200',
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
  }

  return (
    <nav className="bg-white border-b border-site-200 sticky top-0 z-50 shadow-sm">
      {/* Top bar */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(roleHome)}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-construction-500 to-construction-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <HardHat className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-site-800 text-lg tracking-tight">
                Onsite<span className="text-construction-500">Pro</span>
              </span>
            </button>
            <span className={`badge text-[10px] capitalize border ${roleBadgeStyles[user.role] || roleBadgeStyles.pm}`}>
              {user.role}
            </span>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {sites.length > 0 && (
              <div className="relative">
                <div className="flex items-center gap-1.5 text-site-500">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <select
                    className="text-sm font-medium border border-site-200 rounded-xl px-3 py-1.5 pr-7 bg-site-50 max-w-[160px] truncate appearance-none cursor-pointer hover:border-site-300 focus:ring-2 focus:ring-construction-400 focus:border-construction-500 transition-colors"
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
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-site-400" />
                </div>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-site-500 pl-1">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">{user.displayName?.split(' ')[0]}</span>
            </div>
            <button
              onClick={async () => { await logout(); router.push('/') }}
              className="flex items-center gap-1 text-sm text-site-400 hover:text-safety-red transition-colors ml-1 p-1.5 rounded-lg hover:bg-red-50"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || (link.href !== '/foreman' && link.href !== '/pm' && pathname.startsWith(link.href + '/'))
            return (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-construction-500 text-construction-600'
                    : 'border-transparent text-site-400 hover:text-site-600 hover:border-site-300'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                {link.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Test mode banner */}
      {site?.isTestSite && (
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-center text-xs font-bold py-1.5 tracking-widest uppercase flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Test Mode — Data will not affect production
          <Shield className="w-3.5 h-3.5" />
        </div>
      )}
    </nav>
  )
}
