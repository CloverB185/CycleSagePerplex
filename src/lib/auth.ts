import { cookies } from 'next/headers'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { createHmac } from 'crypto'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  role: 'foreman' | 'pm' | 'admin'
  organizationId: string
}

const SESSION_COOKIE = 'onsitepro_session'
// In production, use a strong secret from environment variable
const SESSION_SECRET = process.env.SESSION_SECRET || 'onsitepro-hmac-secret-change-in-production'

function signPayload(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
}

function createSignedToken(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64')
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

function verifySignedToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  const expectedSig = signPayload(payload)
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSig.length) return null
  let mismatch = 0
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }
  if (mismatch !== 0) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString())
  } catch {
    return null
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = createSignedToken({ userId, ts: Date.now() })
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

  const data = verifySignedToken(token)
  if (!data || !data.userId) return null

  try {
    const user = await prisma.user.findUnique({
      where: { id: data.userId as string },
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
