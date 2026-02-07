'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    )
  }

  if (user) return null // Redirecting

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">OnsitePro Claude</h1>
          <p className="text-gray-500 mt-1">Construction Site Truth Capture</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          {error && (
            <div className="bg-red-50 text-safety-red text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.co.za"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-xs text-gray-400 text-center pt-2">
            <p className="font-medium mb-1">Test accounts (password: password123)</p>
            <p>Foreman: thabo@buildright.co.za</p>
            <p>PM: pm@buildright.co.za</p>
            <p>Admin: admin@buildright.co.za</p>
          </div>
        </form>
      </div>
    </div>
  )
}
