'use client'

import { useAuth } from './AuthProvider'
import { useRouter, usePathname } from 'next/navigation'

export default function NavBar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (!user) return null

  const roleHome = user.role === 'foreman' ? '/foreman' : user.role === 'pm' ? '/pm' : '/admin'

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

  const links = user.role === 'foreman' ? foremanLinks : user.role === 'pm' ? pmLinks : pmLinks

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(roleHome)}
              className="font-bold text-brand-700 text-lg"
            >
              OnsitePro
            </button>
            <span className="badge bg-brand-100 text-brand-700 text-xs capitalize">
              {user.role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:block">{user.displayName}</span>
            <button
              onClick={async () => { await logout(); router.push('/') }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 -mb-px overflow-x-auto">
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
