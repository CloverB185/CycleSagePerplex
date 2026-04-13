import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'

// GET: List recent audit logs (admin only)
export const GET = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'admin', 'pm', 'owner')
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  const logs = await prisma.auditLog.findMany({
    orderBy: { serverTimestamp: 'desc' },
    take: limit,
    include: {
      performedBy: {
        select: { id: true, displayName: true },
      },
    },
  })

  return NextResponse.json({ logs })
})
