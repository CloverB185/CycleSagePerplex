import { cookies } from 'next/headers'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  role: 'foreman' | 'pm' | 'admin'
  organizationId: string
}

const SESSION_COOKIE = 'onsitepro_session'

// Simple session: store user ID in a signed cookie
// In production, use JWT or proper session store
export async function createSession(userId: string): Promise<string> {
  // Base64-encode the user ID as a simple session token
  const token = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { userId } = JSON.parse(Buffer.from(token, 'base64').toString())
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        organizationId: true,
        isActive: true,
      },
    })
    if (!user || !user.isActive) return null
    return user as SessionUser
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function verifyPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as SessionUser['role'],
    organizationId: user.organizationId,
  }
}

export function requireRole(user: SessionUser | null, ...roles: string[]): SessionUser {
  if (!user) throw new AuthError('Not authenticated', 401)
  if (!roles.includes(user.role)) throw new AuthError('Insufficient permissions', 403)
  return user
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}
