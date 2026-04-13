import { NextResponse } from 'next/server'
import { getSession, requireRole, isManagementClass } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ImmutabilityError, checkSyncDedup, recordSyncAction } from '@/lib/api-helpers'
import { assertSiteAccess, assertOwnership } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// GET: Get a single daily report
export const GET = apiHandler(async (_req, context: unknown) => {
  const { id } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')

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

  // Idempotency check
  if (await checkSyncDedup(body.syncActionId)) {
    return NextResponse.json({ report, deduplicated: true })
  }

  // Immutability: cannot edit submitted reports
  if (report.status === 'submitted') {
    throw new ImmutabilityError('Cannot modify a submitted daily report. Use annotations for corrections.')
  }

  assertOwnership(user, report.createdById)

  const { action, ...updates } = body

  // Submit action
  if (action === 'submit') {
    const guardrails = await prisma.guardrailsConfig.findUnique({ where: { siteId: report.siteId } })
    const requireEvidence = guardrails?.requireEvidenceOnReportSubmit ?? false

    const evidenceCount = await prisma.evidence.count({
      where: { contextType: 'daily_report', contextId: id },
    })

    // Block submission if evidence required and none attached
    if (requireEvidence && evidenceCount === 0) {
      if (isManagementClass(user.role) && (guardrails?.allowOverrideOnEvidenceGate ?? true) && body.overrideReason) {
        await prisma.actionOverride.create({
          data: {
            entityType: 'daily_report',
            entityId: id,
            action: 'submit_without_evidence',
            overrideReason: body.overrideReason,
            performedById: user.id,
            siteId: report.siteId,
          },
        })
        await logAudit({
          entityType: 'DailyReport',
          entityId: id,
          action: 'override',
          performedById: user.id,
          changesAfter: { action: 'submit_without_evidence', reason: body.overrideReason },
        })
      } else if (isManagementClass(user.role) && (guardrails?.allowOverrideOnEvidenceGate ?? true)) {
        return NextResponse.json(
          { error: 'Evidence required. As management, provide overrideReason to proceed.', requiresOverride: true },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'Evidence required to submit this report. Upload evidence first.' },
          { status: 400 }
        )
      }
    }

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

    if (body.syncActionId) {
      await recordSyncAction(body.syncActionId, user.id, 'submitDailyReport', { reportId: id })
    }

    return NextResponse.json({
      report: updated,
      warnings: evidenceCount === 0 ? ['No evidence attached to this report'] : [],
    })
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

  if (body.syncActionId) {
    await recordSyncAction(body.syncActionId, user.id, 'updateDailyReport', { reportId: id })
  }

  return NextResponse.json({ report: updated })
})
