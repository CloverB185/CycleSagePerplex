import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ImmutabilityError, checkSyncDedup, recordSyncAction } from '@/lib/api-helpers'
import { assertOwnership } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// PATCH: Update a tomorrow plan (only before planDate)
export const PATCH = apiHandler(async (req, context: unknown) => {
  const { id } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman')
  const body = await req.json()

  const plan = await prisma.tomorrowPlan.findUnique({ where: { id } })
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  assertOwnership(user, plan.createdById)

  // Idempotency check
  if (await checkSyncDedup(body.syncActionId)) {
    return NextResponse.json({ plan, deduplicated: true })
  }

  // Immutability: cannot edit after planDate arrives
  const today = new Date().toISOString().split('T')[0]
  if (plan.planDate <= today) {
    throw new ImmutabilityError('Cannot modify a tomorrow plan after the plan date has arrived')
  }

  const updates: Record<string, unknown> = {}
  if (body.tasks !== undefined) updates.tasks = body.tasks
  if (body.requiredResources !== undefined) updates.requiredResources = body.requiredResources
  if (body.knownRisks !== undefined) updates.knownRisks = body.knownRisks

  const updated = await prisma.tomorrowPlan.update({
    where: { id },
    data: updates,
  })

  await logAudit({
    entityType: 'TomorrowPlan',
    entityId: id,
    action: 'update',
    performedById: user.id,
    changesAfter: updates,
  })

  if (body.syncActionId) {
    await recordSyncAction(body.syncActionId, user.id, 'updateTomorrowPlan', { planId: id })
  }

  return NextResponse.json({ plan: updated })
})
