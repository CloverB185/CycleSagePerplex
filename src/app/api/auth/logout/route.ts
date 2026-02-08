import { NextResponse } from 'next/server'
import { getSession, destroySession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST() {
  const user = await getSession()

  await destroySession()

  if (user) {
    await logAudit({
      entityType: 'User',
      entityId: user.id,
      action: 'logout',
      performedById: user.id,
    })
  }

  return NextResponse.json({ ok: true })
}
