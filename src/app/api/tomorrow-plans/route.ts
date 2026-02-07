import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// GET: List tomorrow plans for a site
export const GET = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin')
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  await assertSiteAccess(user, siteId)

  const where: Record<string, unknown> = { siteId }
  if (user.role === 'foreman') {
    where.createdById = user.id
  }

  const plans = await prisma.tomorrowPlan.findMany({
    where,
    include: {
      createdBy: { select: { id: true, displayName: true } },
    },
    orderBy: { planDate: 'desc' },
  })

  return NextResponse.json({ plans })
})

// POST: Create a tomorrow plan
export const POST = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman')
  const body = await req.json()

  const { siteId, planDate, tasks, requiredResources, knownRisks, syncActionId } = body

  if (!siteId || !planDate || !tasks) {
    return NextResponse.json(
      { error: 'siteId, planDate, and tasks are required' },
      { status: 400 }
    )
  }

  // Idempotency check
  if (syncActionId) {
    const existing = await prisma.tomorrowPlan.findUnique({ where: { syncActionId } })
    if (existing) {
      return NextResponse.json({ plan: existing, deduplicated: true })
    }
  }

  await assertSiteAccess(user, siteId)

  // Check for duplicate
  const duplicate = await prisma.tomorrowPlan.findUnique({
    where: { siteId_createdById_planDate: { siteId, createdById: user.id, planDate } },
  })
  if (duplicate) {
    return NextResponse.json(
      { error: 'A plan already exists for this date', existingId: duplicate.id },
      { status: 409 }
    )
  }

  const plan = await prisma.tomorrowPlan.create({
    data: {
      siteId,
      createdById: user.id,
      planDate,
      tasks,
      requiredResources: requiredResources || null,
      knownRisks: knownRisks || null,
      syncActionId: syncActionId || null,
    },
  })

  await logAudit({
    entityType: 'TomorrowPlan',
    entityId: plan.id,
    action: 'create',
    performedById: user.id,
    changesAfter: { siteId, planDate, tasks },
  })

  return NextResponse.json({ plan }, { status: 201 })
})
