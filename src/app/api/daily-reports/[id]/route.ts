import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ImmutabilityError } from '@/lib/api-helpers'
import { assertSiteAccess, assertOwnership } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// GET: Get a single daily report
export const GET = apiHandler(async (_req, context: unknown) => {
  const { id } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin')

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, displayName: true } },
      site: { select: { id: true, name: true } },
      annotations: {
        include: { createdBy: { select: { id: true, displayName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      evidence: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  await assertSiteAccess(user, report.siteId)

  // Foremen can only see their own reports
  if (user.role === 'foreman' && report.createdById !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  return NextResponse.json({ report })
})

// PATCH: Update draft report or submit
export const PATCH = apiHandler(async (req, context: unknown) => {
  const { id } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman')
  const body = await req.json()

  const report = await prisma.dailyReport.findUnique({ where: { id } })
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Immutability: cannot edit submitted reports
  if (report.status === 'submitted') {
    throw new ImmutabilityError('Cannot modify a submitted daily report. Use annotations for corrections.')
  }

  assertOwnership(user, report.createdById)

  const { action, ...updates } = body

  // Submit action
  if (action === 'submit') {
    const updated = await prisma.dailyReport.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        // Also apply any final field updates
        ...(updates.workSummary && { workSummary: updates.workSummary }),
        ...(updates.personnelOnSite !== undefined && { personnelOnSite: updates.personnelOnSite }),
        ...(updates.issuesOrBlockers !== undefined && { issuesOrBlockers: updates.issuesOrBlockers }),
        ...(updates.incidents !== undefined && { incidents: updates.incidents }),
        ...(updates.weatherConditions !== undefined && { weatherConditions: updates.weatherConditions }),
        ...(updates.qaSafetyConfirmed !== undefined && { qaSafetyConfirmed: updates.qaSafetyConfirmed }),
      },
    })

    await logAudit({
      entityType: 'DailyReport',
      entityId: id,
      action: 'submit',
      performedById: user.id,
      changesBefore: { status: 'draft' },
      changesAfter: { status: 'submitted', submittedAt: updated.submittedAt },
    })

    return NextResponse.json({ report: updated })
  }

  // Regular draft update
  const updated = await prisma.dailyReport.update({
    where: { id },
    data: {
      ...(updates.workSummary && { workSummary: updates.workSummary }),
      ...(updates.personnelOnSite !== undefined && { personnelOnSite: updates.personnelOnSite }),
      ...(updates.issuesOrBlockers !== undefined && { issuesOrBlockers: updates.issuesOrBlockers }),
      ...(updates.incidents !== undefined && { incidents: updates.incidents }),
      ...(updates.weatherConditions !== undefined && { weatherConditions: updates.weatherConditions }),
      ...(updates.qaSafetyConfirmed !== undefined && { qaSafetyConfirmed: updates.qaSafetyConfirmed }),
    },
  })

  await logAudit({
    entityType: 'DailyReport',
    entityId: id,
    action: 'update',
    performedById: user.id,
    changesAfter: updates,
  })

  return NextResponse.json({ report: updated })
})
