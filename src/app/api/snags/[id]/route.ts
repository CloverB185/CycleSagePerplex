import { NextResponse } from 'next/server'
import { getSession, requireRole, isManagementClass } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ImmutabilityError, checkSyncDedup, recordSyncAction } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// GET: Get a single snag with comments and evidence
export const GET = apiHandler(async (_req, context: unknown) => {
  const { id } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')

  const snag = await prisma.snag.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, displayName: true } },
      owner: { select: { id: true, displayName: true } },
      site: { select: { id: true, name: true } },
      comments: {
        include: { createdBy: { select: { id: true, displayName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!snag) {
    return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
  }

  await assertSiteAccess(user, snag.siteId)

  // Get associated evidence
  const evidence = await prisma.evidence.findMany({
    where: { contextType: 'snag', contextId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ snag, evidence })
})

// PATCH: Update snag status or owner
export const PATCH = apiHandler(async (req, context: unknown) => {
  const { id } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')
  const body = await req.json()

  const snag = await prisma.snag.findUnique({ where: { id } })
  if (!snag) {
    return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
  }

  // Idempotency check
  if (await checkSyncDedup(body.syncActionId)) {
    return NextResponse.json({ snag, deduplicated: true })
  }

  // Closed snags cannot be modified
  if (snag.status === 'closed') {
    throw new ImmutabilityError('Cannot modify a closed snag')
  }

  await assertSiteAccess(user, snag.siteId)

  // Foremen can only update snags they created or own
  if (user.role === 'foreman' && snag.createdById !== user.id && snag.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Core fields are immutable
  if (body.title || body.description || body.category) {
    throw new ImmutabilityError('Cannot modify snag title, description, or category after creation')
  }

  const updates: Record<string, unknown> = {}
  const changesBefore: Record<string, unknown> = {}

  // Status update with transition validation
  if (body.status) {
    const validTransitions: Record<string, string[]> = {
      open: ['in_progress'],
      in_progress: ['open', 'closed'],
    }

    const allowed = validTransitions[snag.status]
    if (!allowed || !allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${snag.status}' to '${body.status}'` },
        { status: 400 }
      )
    }

    // Closure: check guardrails for evidence requirement
    if (body.status === 'closed') {
      const guardrails = await prisma.guardrailsConfig.findUnique({ where: { siteId: snag.siteId } })
      const requireEvidence = guardrails?.requireEvidenceOnSnagClose ?? true

      if (requireEvidence) {
        const evidenceCount = await prisma.evidence.count({
          where: { contextType: 'snag', contextId: id },
        })
        if (evidenceCount === 0) {
          // Management-class can override if allowed
          if (isManagementClass(user.role) && (guardrails?.allowOverrideOnEvidenceGate ?? true) && body.overrideReason) {
            await prisma.actionOverride.create({
              data: {
                entityType: 'snag',
                entityId: id,
                action: 'close_without_evidence',
                overrideReason: body.overrideReason,
                performedById: user.id,
                siteId: snag.siteId,
              },
            })
            await logAudit({
              entityType: 'Snag',
              entityId: id,
              action: 'override',
              performedById: user.id,
              changesAfter: { action: 'close_without_evidence', reason: body.overrideReason },
            })
          } else if (isManagementClass(user.role) && (guardrails?.allowOverrideOnEvidenceGate ?? true)) {
            return NextResponse.json(
              { error: 'Evidence required. As management, provide overrideReason to proceed.', requiresOverride: true },
              { status: 400 }
            )
          } else {
            return NextResponse.json(
              { error: 'Resolution evidence required to close this snag. Upload evidence first.' },
              { status: 400 }
            )
          }
        }
      }
      updates.closedAt = new Date()
      updates.closedById = user.id
    }

    changesBefore.status = snag.status
    updates.status = body.status
  }

  // Owner reassignment (PM/admin only)
  if (body.ownerId) {
    if (user.role === 'foreman') {
      return NextResponse.json({ error: 'Only PMs can reassign snag ownership' }, { status: 403 })
    }
    changesBefore.ownerId = snag.ownerId
    updates.ownerId = body.ownerId
  }

  const updated = await prisma.snag.update({
    where: { id },
    data: updates,
    include: {
      createdBy: { select: { id: true, displayName: true } },
      owner: { select: { id: true, displayName: true } },
    },
  })

  await logAudit({
    entityType: 'Snag',
    entityId: id,
    action: body.status ? 'status_change' : 'update',
    performedById: user.id,
    changesBefore,
    changesAfter: updates,
  })

  if (body.syncActionId) {
    await recordSyncAction(body.syncActionId, user.id, 'updateSnag', { snagId: id })
  }

  return NextResponse.json({ snag: updated })
})
