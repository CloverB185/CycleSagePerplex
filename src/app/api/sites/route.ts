import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'

export const GET = apiHandler(async () => {
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin')

  if (user.role === 'foreman') {
    // Foremen only see assigned sites
    const assignments = await prisma.siteAssignment.findMany({
      where: { userId: user.id, isActive: true },
      include: { site: true },
    })
    const sites = assignments.map((a) => a.site).filter((s) => s.isActive)
    return NextResponse.json({ sites })
  }

  // PMs and admins see all sites in their org
  const sites = await prisma.site.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ sites })
})
