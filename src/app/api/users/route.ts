import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'

// GET: List users (for snag owner selection, etc.)
export const GET = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  if (siteId) {
    // Get users assigned to a specific site
    const assignments = await prisma.siteAssignment.findMany({
      where: { siteId, isActive: true },
      include: {
        user: {
          select: { id: true, displayName: true, email: true, role: true, isActive: true },
        },
      },
    })
    const users = assignments.map((a) => a.user).filter((u) => u.isActive)
    return NextResponse.json({ users })
  }

  // Admin/PM: get all users in org
  if (user.role === 'admin' || user.role === 'pm') {
    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, displayName: true, email: true, role: true },
      orderBy: { displayName: 'asc' },
    })
    return NextResponse.json({ users })
  }

  return NextResponse.json({ users: [] })
})
