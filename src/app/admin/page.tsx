'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/')
    }
  }, [user, loading, router])

  // Admin redirects to PM dashboard (same views, with admin badge)
  useEffect(() => {
    if (user?.role === 'admin') router.push('/pm')
  }, [user, router])

  return <div className="min-h-screen flex items-center justify-center text-gray-400">Redirecting...</div>
}
