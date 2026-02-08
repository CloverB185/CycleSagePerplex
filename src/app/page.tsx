'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { HardHat, Eye, EyeOff } from 'lucide-react'

export default function Home() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'foreman') router.push('/foreman')
      else if (user.role === 'pm') router.push('/pm')
      else if (user.role === 'admin') router.push('/admin')
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-900 to-site-900">
        <div className="flex flex-col items-center gap-3">
          <HardHat className="w-10 h-10 text-construction-400 animate-pulse" />
          <p className="text-brand-300 text-mobile-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) return null // Redirecting

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-800 via-brand-900 to-site-900">
      {/* Top section with branding */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-safe-top">
        <div className="w-full max-w-sm">
          {/* Logo & branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-construction-500/20 border border-construction-400/30 mb-4">
              <HardHat className="w-10 h-10 text-construction-400" />
            </div>
            <h1 className="text-mobile-2xl font-bold text-white">OnsitePro</h1>
            <p className="text-mobile-sm text-brand-300 mt-1">Construction Site Truth Capture</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-400/30 text-red-300 text-mobile-sm p-3 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label className="block text-mobile-sm font-medium text-brand-200 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3.5 bg-white/10 border-2 border-white/20 rounded-xl
                           text-white placeholder-brand-400 text-mobile-base
                           focus:ring-2 focus:ring-construction-400 focus:border-construction-500
                           transition-colors min-h-touch-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.co.za"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-mobile-sm font-medium text-brand-200 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3.5 pr-12 bg-white/10 border-2 border-white/20 rounded-xl
                             text-white placeholder-brand-400 text-mobile-base
                             focus:ring-2 focus:ring-construction-400 focus:border-construction-500
                             transition-colors min-h-touch-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-construction-500 text-white py-4 rounded-xl font-bold text-mobile-lg
                         hover:bg-construction-600 active:bg-construction-700 active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150 shadow-action min-h-touch-lg mt-2"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Test accounts */}
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-mobile-xs font-bold text-brand-300 uppercase tracking-wider mb-2">
              Test Accounts
            </p>
            <div className="space-y-1.5 text-mobile-xs text-brand-400">
              <p>
                <span className="text-brand-300">Foreman:</span> thabo@buildright.co.za
              </p>
              <p>
                <span className="text-brand-300">PM:</span> pm@buildright.co.za
              </p>
              <p>
                <span className="text-brand-300">Admin:</span> admin@buildright.co.za
              </p>
              <p className="text-brand-500 mt-1">Password: password123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="text-center py-4 pb-safe-bottom">
        <p className="text-mobile-xs text-brand-600">OnsitePro v1.0</p>
      </div>
    </div>
  )
}
