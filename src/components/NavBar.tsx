'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useSite } from './SiteProvider'
import { useRouter, usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  CalendarClock,
  FileText,
  Shield,
  HardHat,
  MapPin,
  LogOut,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleNav = (href: string) => {
    router.push(href)
    setMobileMenuOpen(false)
  }

  return (
    <>
      <nav className="bg-white border-b border-site-200 sticky top-0 z-50 shadow-sm">
        {/* Top bar */}
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleNav(roleHome)}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-construction-500 to-construction-600 rounded-lg flex items-center justify-center shadow-sm group-active:scale-95 transition-transform">
                  <HardHat className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-extrabold text-site-800 text-mobile-lg tracking-tight">
                  Onsite<span className="text-construction-500">Pro</span>
                </span>
              </button>
              <span className={clsx(
                'text-[10px] capitalize border px-2 py-0.5 rounded-full font-bold',
                roleBadgeStyles[user.role] || roleBadgeStyles.pm
              )}>
                {user.role}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Site selector — compact on mobile */}
              {sites.length > 0 && (
                <div className="relative flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-site-400 absolute left-2 pointer-events-none" />
                  <select
                    className="text-mobile-xs font-medium border border-site-200 rounded-xl pl-7 pr-6 py-1.5 bg-site-50 max-w-[120px] sm:max-w-[160px] truncate appearance-none cursor-pointer focus:ring-2 focus:ring-construction-400 focus:border-construction-500 transition-colors"
                    value={site?.id || ''}
                    onChange={(e) => {
                      const s = sites.find((s) => s.id === e.target.value)
                      if (s) selectSite(s)
                    }}
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.isTestSite ? '[T] ' : ''}{s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none text-site-400" />
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-site-500 hover:bg-site-50 active:bg-site-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Sign out — hidden on mobile (in mobile menu) */}
              <button
                onClick={async () => { await logout(); router.push('/') }}
                className="hidden sm:flex items-center p-1.5 rounded-lg text-site-400 hover:text-safety-red hover:bg-red-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop navigation tabs */}
          <div className="hidden sm:flex gap-0.5 -mb-px overflow-x-auto">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href !== '/foreman' && link.href !== '/pm' && pathname.startsWith(link.href + '/'))
              return (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2.5 text-mobile-sm font-semibold border-b-2 whitespace-nowrap transition-all',
                    isActive
                      ? 'border-construction-500 text-construction-600'
                      : 'border-transparent text-site-400 hover:text-site-600 hover:border-site-300'
                  )}
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
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-center text-mobile-xs font-bold py-1 tracking-widest uppercase flex items-center justify-center gap-2">
            <Shield className="w-3 h-3" />
            Test Mode
            <Shield className="w-3 h-3" />
          </div>
        )}
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-site-200 shadow-mobile safe-area-bottom">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}>
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || (link.href !== '/foreman' && link.href !== '/pm' && pathname.startsWith(link.href + '/'))
            return (
              <button
                key={link.href}
                onClick={() => handleNav(link.href)}
                className={clsx(
                  'flex flex-col items-center gap-0.5 py-2 min-h-touch transition-colors',
                  isActive
                    ? 'text-construction-600'
                    : 'text-site-400 active:text-site-600'
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.75} />
                <span className={clsx(
                  'text-[10px] font-semibold',
                  isActive && 'text-construction-600'
                )}>
                  {link.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-construction-500 -mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-[60] bg-black/40 animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="bg-white border-b border-site-200 shadow-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-site-100">
              <p className="text-mobile-sm font-semibold text-site-800">{user.displayName}</p>
              <p className="text-mobile-xs text-site-500">{user.email}</p>
            </div>

            <div className="py-2">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <button
                    key={link.href}
                    onClick={() => handleNav(link.href)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-mobile-base font-medium transition-colors',
                      isActive
                        ? 'bg-construction-50 text-construction-700'
                        : 'text-site-700 active:bg-site-50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </button>
                )
              })}
            </div>

            <div className="border-t border-site-100 px-4 py-3">
              <button
                onClick={async () => {
                  setMobileMenuOpen(false)
                  await logout()
                  router.push('/')
                }}
                className="flex items-center gap-2 text-mobile-sm text-safety-red font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for mobile bottom bar */}
      <div className="sm:hidden h-16" />
    </>
  )
}
