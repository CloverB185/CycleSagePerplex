import { NextResponse } from 'next/server'
import { verifyPassword, createSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await verifyPassword(email, password)
    if (!user) {
      // Log failed login attempt
      const attemptedUser = await prisma.user.findUnique({ where: { email } })
      if (attemptedUser) {
        await logAudit({
          entityType: 'User',
          entityId: attemptedUser.id,
          action: 'login_failed',
          performedById: attemptedUser.id,
          changesAfter: { email, reason: 'invalid_password' },
        })
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    await createSession(user.id)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await logAudit({
      entityType: 'User',
      entityId: user.id,
      action: 'login',
      performedById: user.id,
      changesAfter: { email: user.email, role: user.role },
    })

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
