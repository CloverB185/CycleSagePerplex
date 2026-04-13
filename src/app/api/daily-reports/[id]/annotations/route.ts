import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, checkSyncDedup, recordSyncAction } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// POST: Add an annotation to a daily report
export const POST = apiHandler(async (req, context: unknown) => {
  const { id: dailyReportId } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')
  const body = await req.json()

  const report = await prisma.dailyReport.findUnique({ where: { id: dailyReportId } })
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  await assertSiteAccess(user, report.siteId)

  // Foremen can only annotate their own reports
  if (user.role === 'foreman' && report.createdById !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Idempotency check
  if (await checkSyncDedup(body.syncActionId)) {
    return NextResponse.json({ deduplicated: true })
  }

  const { content, annotationType } = body
  if (!content || !annotationType) {
    return NextResponse.json({ error: 'content and annotationType required' }, { status: 400 })
  }

  const validTypes = ['correction', 'comment', 'amendment_request']
  if (!validTypes.includes(annotationType)) {
    return NextResponse.json({ error: `annotationType must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  // Only PMs/admins can create amendment_requests
  if (annotationType === 'amendment_request' && user.role === 'foreman') {
    return NextResponse.json({ error: 'Only PMs can request amendments' }, { status: 403 })
  }

  const annotation = await prisma.dailyReportAnnotation.create({
    data: {
      dailyReportId,
      createdById: user.id,
      content,
      annotationType,
    },
    include: {
      createdBy: { select: { id: true, displayName: true, role: true } },
    },
  })

  await logAudit({
    entityType: 'DailyReportAnnotation',
    entityId: annotation.id,
    action: 'create',
    performedById: user.id,
    changesAfter: { dailyReportId, content, annotationType },
  })

  if (body.syncActionId) {
    await recordSyncAction(body.syncActionId, user.id, 'createAnnotation', { annotationId: annotation.id })
  }

  return NextResponse.json({ annotation }, { status: 201 })
})
